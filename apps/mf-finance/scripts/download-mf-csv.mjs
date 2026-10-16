#!/usr/bin/env node
// Download Money Forward CSVs through the logged-in Chrome CDP profile.
// Usage: node scripts/download-mf-csv.mjs URL [URL ...]

import { copyFile, mkdtemp, readFile, rmdir, stat, unlink } from 'node:fs/promises';
import { basename, join, parse } from 'node:path';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';

const endpoint = process.env.MF_CDP_ENDPOINT ?? 'http://127.0.0.1:9223';
const downloads = join(os.homedir(), 'Downloads');
const urls = process.argv.slice(2);
const allowed = (url) => {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://moneyforward.com' || parsed.username || parsed.password) return false;
  if (parsed.pathname === '/bs/history/csv') return parsed.search === '';
  if (parsed.pathname !== '/cf/csv') return false;
  const keys = [...parsed.searchParams.keys()].sort();
  const year = parsed.searchParams.get('year');
  const month = parsed.searchParams.get('month');
  const from = parsed.searchParams.get('from');
  return keys.join(',') === 'from,month,year' && /^\d{4}$/.test(year ?? '') &&
    /^(?:[1-9]|1[0-2])$/.test(month ?? '') && from === `${year}/${String(month).padStart(2, '0')}/01`;
};

if (!urls.length || new Set(urls).size !== urls.length || urls.some((url) => !allowed(url))) {
  console.error('Pass one or more https://moneyforward.com/cf/csv?... or /bs/history/csv URLs.');
  process.exit(2);
}
if (typeof WebSocket === 'undefined') throw new Error('Node 22+ with global WebSocket is required.');

const json = async (path) => {
  const response = await fetch(new URL(path, endpoint));
  if (!response.ok) throw new Error(`CDP endpoint returned HTTP ${response.status}`);
  return response.json();
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const temporaryDirs = new Set();

async function copyToUniqueDownload(source, suggestedFilename) {
  const parsed = parse(basename(suggestedFilename));
  for (let suffix = 0; suffix < 10_000; suffix++) {
    const name = suffix === 0 ? parsed.base : `${parsed.name} (${suffix})${parsed.ext}`;
    const destination = join(downloads, name);
    try {
      await copyFile(source, destination, constants.COPYFILE_EXCL);
      return destination;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  throw new Error(`Could not find a free filename for ${suggestedFilename}.`);
}

async function fingerprint(path) {
  const bytes = await readFile(path);
  return { size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}

const version = await json('/json/version');
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 0;
const pending = new Map();
const listeners = new Map();
const latestEvents = new Map();
const temporaryTargets = new Set();
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method?.startsWith('Browser.download')) {
    const events = latestEvents.get(message.method) ?? [];
    events.push(message.params);
    latestEvents.set(message.method, events.slice(-100));
  }
  for (const callback of listeners.get(message.method) ?? []) callback(message.params);
});
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const on = (method, callback) => {
  const set = listeners.get(method) ?? new Set();
  set.add(callback);
  listeners.set(method, set);
  return () => set.delete(callback);
};
const waitEvent = (method, predicate, timeoutMs, description) => new Promise((resolve, reject) => {
  const cached = (latestEvents.get(method) ?? []).find(predicate);
  if (cached) return resolve(cached);
  const timer = setTimeout(() => { off(); reject(new Error(`Timed out waiting for ${description}.`)); }, timeoutMs);
  const off = on(method, (event) => {
    if (!predicate(event)) return;
    clearTimeout(timer);
    off();
    resolve(event);
  });
});

let behaviorSet = false;
let operationError;
try {
  for (const url of urls) {
    const temporaryDir = await mkdtemp(join(downloads, '.mf-finance-csv-'));
    temporaryDirs.add(temporaryDir);
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: temporaryDir, eventsEnabled: true });
    behaviorSet = true;
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    temporaryTargets.add(targetId);
    const target = await json('/json/list');
    let page = target.find((item) => item.id === targetId);
    for (let attempt = 0; !page && attempt < 30; attempt++) {
      await sleep(100);
      page = (await json('/json/list')).find((item) => item.id === targetId);
    }
    if (!page?.webSocketDebuggerUrl) throw new Error('Could not find the temporary download tab.');

    const pageSocket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      pageSocket.addEventListener('open', resolve, { once: true });
      pageSocket.addEventListener('error', reject, { once: true });
    });
    const pageCommand = (id, method, params = {}) => new Promise((resolve, reject) => {
      const receive = ({ data }) => {
        const message = JSON.parse(data);
        if (message.id !== id) return;
        pageSocket.removeEventListener('message', receive);
        message.error ? reject(new Error(message.error.message)) : resolve(message.result);
      };
      pageSocket.addEventListener('message', receive);
      pageSocket.send(JSON.stringify({ id, method, params }));
    });
    await pageCommand(1, 'Page.enable');
    // ERR_ABORTED for a download navigation is expected; completion is determined by Browser events.
    const navigation = await pageCommand(2, 'Page.navigate', { url });
    if (navigation.errorText && navigation.errorText !== 'net::ERR_ABORTED') {
      throw new Error(`CSV navigation failed: ${navigation.errorText}`);
    }
    pageSocket.close();

    const started = await waitEvent('Browser.downloadWillBegin',
      (event) => event.url === url && event.frameId === navigation.frameId,
      90_000, 'downloadWillBegin for the temporary CSV tab');
    if (!started.suggestedFilename?.toLowerCase().endsWith('.csv') ||
        basename(started.suggestedFilename) !== started.suggestedFilename) {
      throw new Error(`Expected a CSV download, received ${started.suggestedFilename ?? 'unnamed file'}; verify MF login.`);
    }
    const completed = await waitEvent('Browser.downloadProgress', (event) => event.guid === started.guid &&
      ['completed', 'canceled'].includes(event.state), 120_000, `download completion for ${started.suggestedFilename}`);
    if (completed.state === 'canceled') throw new Error(`Chrome canceled ${started.suggestedFilename}.`);
    const source = join(temporaryDir, started.suggestedFilename);
    const info = await stat(source).catch(() => null);
    if (!info?.isFile() || info.size <= 0) throw new Error(`Download completed (${completed.guid}) but ${started.suggestedFilename} is missing or empty.`);
    const destination = await copyToUniqueDownload(source, started.suggestedFilename);
    const [sourceFingerprint, destinationFingerprint] = await Promise.all([fingerprint(source), fingerprint(destination)]);
    if (sourceFingerprint.size !== destinationFingerprint.size || sourceFingerprint.sha256 !== destinationFingerprint.sha256) {
      throw new Error(`Copied file verification failed; source preserved at ${source}, copy at ${destination}.`);
    }
    await unlink(source);
    console.log(JSON.stringify({ url, suggestedFilename: started.suggestedFilename, path: destination, bytes: sourceFingerprint.size, sha256: sourceFingerprint.sha256 }));
  }
} catch (error) {
  operationError = error;
  throw error;
} finally {
  for (const targetId of temporaryTargets) {
    try { await send('Target.closeTarget', { targetId }); } catch {}
  }
  if (behaviorSet) {
    try { await send('Browser.setDownloadBehavior', { behavior: 'default' }); } catch {}
  }
  if (operationError) {
    if (temporaryDirs.size) console.error(`Temporary download files preserved for inspection: ${[...temporaryDirs].join(', ')}`);
  } else {
    for (const directory of temporaryDirs) {
      try { await rmdir(directory); }
      catch (error) {
        if (error.code !== 'ENOENT') console.error(`Temporary directory left in place (not empty or cleanup failed): ${directory}`);
      }
    }
  }
  socket.close();
}
