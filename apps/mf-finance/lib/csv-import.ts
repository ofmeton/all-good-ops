import "server-only";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { dataDir } from "./data-dir";
import { refreshData } from "./data-refresh";
import { decodeMfCsv } from "../scripts/lib/csv-encoding.mjs";
import { parseCsv } from "../scripts/lib/csv.mjs";
import { normalizeRows } from "../scripts/lib/normalize.mjs";

const MAX_CSV_BYTES = 20 * 1024 * 1024;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface CsvImportResult {
  imported: number;
  from: string;
  to: string;
  storedFile: string;
  duplicate: boolean;
  log: string;
}

export async function importMoneyForwardCsv(file: File): Promise<CsvImportResult> {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("CSVファイルを選択してください");
  }
  if (file.size === 0) throw new Error("CSVファイルが空です");
  if (file.size > MAX_CSV_BYTES) throw new Error("CSVは20MB以下にしてください");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = decodeMfCsv(bytes);
  const records = normalizeRows(parseCsv(text));
  const dates = records.map((record: { date: string }) => record.date);

  if (records.length === 0 || dates.some((date: string) => !ISO_DATE.test(date))) {
    throw new Error("Money Forwardの収入・支出詳細CSVとして認識できませんでした");
  }

  const from = dates.reduce((min: string, date: string) => date < min ? date : min);
  const to = dates.reduce((max: string, date: string) => date > max ? date : max);
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const rawDir = resolve(dataDir(), "../../../raw/finance/moneyforward");
  const storedFile = `cashflow-upload-${from}_${to}-${hash}.csv`;
  const destination = resolve(rawDir, storedFile);

  await mkdir(rawDir, { recursive: true });
  let duplicate = false;
  try {
    await access(destination, constants.F_OK);
    duplicate = true;
  } catch {
    await writeFile(destination, bytes, { flag: "wx" });
  }

  const log = await refreshData();
  return { imported: records.length, from, to, storedFile: basename(destination), duplicate, log };
}
