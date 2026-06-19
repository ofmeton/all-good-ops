import ical from "node-ical";
import type { CalendarResponse, VEvent } from "node-ical";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent } from "undici";
import {
  isValidDateString,
  jstDateStringToUtcMs,
  toJstDateString,
} from "@/lib/date";

const MAX_REDIRECTS = 5;

type ResolvedAddress = { address: string; family: 4 | 6 };

export type IcalFetchErrorCode =
  | "invalid_url"
  | "blocked_host"
  | "fetch_failed"
  | "parse_failed";

export class IcalFetchError extends Error {
  constructor(
    public readonly code: IcalFetchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "IcalFetchError";
  }
}

export type NormalizedEvent = {
  uid: string;
  checkinDate: string;
  checkoutDate: string;
  raw: {
    summary: string | null;
    description: string | null;
    url: string | null;
  };
};

type RawEventLike = Partial<VEvent> & {
  type?: string;
  uid?: string;
  start?: Date;
  end?: Date;
};

function parseIpv4(value: string): number[] | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((num, idx) => !Number.isInteger(num) || num < 0 || num > 255 || String(num) !== parts[idx])) {
    return null;
  }
  return nums;
}

function mappedIpv4(value: string): string | null {
  const lower = value.toLowerCase();
  const marker = "::ffff:";
  if (!lower.startsWith(marker)) return null;
  const tail = value.slice(marker.length);
  return parseIpv4(tail) ? tail : null;
}

function isBlockedIpv4(value: string): boolean {
  const parts = parseIpv4(value);
  if (!parts) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function firstIpv6Bytes(value: string): [number, number] | null {
  const normalized = value.toLowerCase();
  if (isIP(normalized) !== 6) return null;
  const firstGroup = normalized.split(":")[0] || "0";
  const group = Number.parseInt(firstGroup, 16);
  if (!Number.isFinite(group)) return null;
  return [(group >> 8) & 0xff, group & 0xff];
}

function isBlockedIpv6(value: string): boolean {
  const mapped = mappedIpv4(value);
  if (mapped) return isBlockedIpv4(mapped);
  if (value === "::1" || value === "0:0:0:0:0:0:0:1") return true;
  const bytes = firstIpv6Bytes(value);
  if (!bytes) return false;
  const [first, second] = bytes;
  return first === 0xfc || first === 0xfd || (first === 0xfe && second >= 0x80 && second <= 0xbf);
}

export function isBlockedAddress(address: string): boolean {
  const kind = isIP(address);
  if (kind === 4) return isBlockedIpv4(address);
  if (kind === 6) return isBlockedIpv6(address);
  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return normalized === "localhost" || normalized.endsWith(".localhost");
}

function configuredAllowedHosts(): string[] {
  return (process.env.ICAL_FEED_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedByOptionalAllowlist(hostname: string): boolean {
  const allowed = configuredAllowedHosts();
  if (allowed.length === 0) return true;
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return allowed.some((host) => normalized === host || normalized.endsWith(`.${host}`));
}

export function assertPublicHttpUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new IcalFetchError("invalid_url", "iCal feed URL is invalid");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new IcalFetchError("invalid_url", "iCal feed URL must use http or https");
  }
  if (!parsed.hostname || isBlockedHostname(parsed.hostname)) {
    throw new IcalFetchError("blocked_host", "iCal feed host is blocked");
  }
  if (!isAllowedByOptionalAllowlist(parsed.hostname)) {
    // Strict OTA allowlisting can be enabled later via ICAL_FEED_ALLOWED_HOSTS
    // without changing call sites. It is intentionally optional for now because
    // feed hosts vary by OTA/provider.
    throw new IcalFetchError("blocked_host", "iCal feed host is not allowlisted");
  }
  const literal = parsed.hostname.startsWith("[") && parsed.hostname.endsWith("]")
    ? parsed.hostname.slice(1, -1)
    : parsed.hostname;
  if (isBlockedAddress(literal)) {
    throw new IcalFetchError("blocked_host", "iCal feed address is blocked");
  }
  return parsed;
}

async function resolvePublicAddresses(hostname: string): Promise<ResolvedAddress[]> {
  const literal = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
  const literalFamily = isIP(literal);
  if (literalFamily) {
    if (isBlockedAddress(literal)) {
      throw new IcalFetchError("blocked_host", "iCal feed address is blocked");
    }
    return [{ address: literal, family: literalFamily as 4 | 6 }];
  }

  let addresses: ResolvedAddress[];
  try {
    addresses = (await lookup(hostname, { all: true, verbatim: true })) as ResolvedAddress[];
  } catch {
    throw new IcalFetchError("fetch_failed", "iCal feed host resolution failed");
  }
  if (addresses.length === 0 || addresses.some((entry) => isBlockedAddress(entry.address))) {
    throw new IcalFetchError("blocked_host", "iCal feed resolved to a blocked address");
  }
  return addresses;
}

async function fetchPinnedToAddress(
  url: URL,
  resolved: ResolvedAddress,
): Promise<Response> {
  const dispatcher = new Agent({
    connect: {
      lookup(_hostname, _options, callback) {
        callback(null, resolved.address, resolved.family);
      },
    },
  });
  try {
    return await fetch(url, {
      redirect: "manual",
      dispatcher,
    } as RequestInit & { dispatcher: Agent });
  } catch {
    throw new IcalFetchError("fetch_failed", "iCal feed fetch failed");
  } finally {
    dispatcher.close();
  }
}

async function fetchIcsText(url: string): Promise<string> {
  let current = assertPublicHttpUrl(url);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const addresses = await resolvePublicAddresses(current.hostname);
    const response = await fetchPinnedToAddress(current, addresses[0]);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || hop === MAX_REDIRECTS) {
        throw new IcalFetchError("fetch_failed", "iCal feed redirect failed");
      }
      current = assertPublicHttpUrl(new URL(location, current).toString());
      continue;
    }

    if (!response.ok) {
      throw new IcalFetchError("fetch_failed", "iCal feed returned an error status");
    }
    return response.text();
  }

  throw new IcalFetchError("fetch_failed", "iCal feed redirect limit exceeded");
}

function textValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value == null) return null;
  if (typeof value === "object" && "val" in value) {
    const inner = (value as { val?: unknown }).val;
    return typeof inner === "string" ? inner : null;
  }
  return null;
}

function dateToReservationDay(value: unknown): string | null {
  if (!(value instanceof Date)) return null;
  const ymd = toJstDateString(value);
  return isValidDateString(ymd) ? ymd : null;
}

export function normalizeEvents(rawMap: CalendarResponse): NormalizedEvent[] {
  const normalized: NormalizedEvent[] = [];

  for (const item of Object.values(rawMap)) {
    const event = item as RawEventLike | undefined;
    if (!event || event.type !== "VEVENT") continue;

    const uid = typeof event.uid === "string" ? event.uid.trim() : "";
    const checkinDate = dateToReservationDay(event.start);
    const checkoutDate = dateToReservationDay(event.end);

    if (!uid || !checkinDate || !checkoutDate) continue;
    if (jstDateStringToUtcMs(checkoutDate) <= jstDateStringToUtcMs(checkinDate)) continue;

    normalized.push({
      uid,
      checkinDate,
      checkoutDate,
      raw: {
        summary: textValue(event.summary),
        description: textValue(event.description),
        url: textValue(event.url),
      },
    });
  }

  return normalized;
}

export function parseIcsText(text: string): NormalizedEvent[] {
  return normalizeEvents(ical.parseICS(text));
}

export async function fetchFeedEvents(url: string): Promise<NormalizedEvent[]> {
  const text = await fetchIcsText(url);
  try {
    return parseIcsText(text);
  } catch {
    throw new IcalFetchError("parse_failed", "iCal feed parse failed");
  }
}
