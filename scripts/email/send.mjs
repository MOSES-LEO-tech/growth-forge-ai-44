#!/usr/bin/env node
/**
 * Growth Forge email sender — Resend or SendGrid, zero dependencies (Node 18+).
 *
 *   node scripts/email/send.mjs --template templates/launch.html \
 *        --subject "Growth Forge is live" --csv recipients.csv
 *
 * Credentials live in scripts/email/.env (gitignored). Nothing here is ever
 * bundled into the Vite app: this script runs on your machine / server only.
 *
 * Flags:
 *   --to <addr[,addr]>        one or more recipients (comma separated)
 *   --csv <path>              recipient list; needs an `email` column
 *   --template <path>         HTML template file ({{var}} placeholders allowed)
 *   --text <string>           plain-text body
 *   --text-file <path>        plain-text body from file
 *   --subject <string>        subject line ({{var}} allowed)
 *   --from <addr|Name <a>>    override EMAIL_FROM
 *   --reply-to <addr>
 *   --tag <name>              campaign tag (stored on the provider)
 *   --attach <path>           file attachment (repeatable)
 *   --var k=v                 template variable (repeatable; row columns win)
 *   --delay <ms>              pause between sends (default 400)
 *   --limit <n>               cap how many recipients are processed
 *   --dry-run                 resolve everything, send nothing
 *   --check                   verify the API key / sending domain, then exit
 *   --help
 */

import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(SCRIPT_DIR, 'logs');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const USAGE = `Growth Forge email sender

  node scripts/email/send.mjs --template templates/launch.html \\
       --subject "Growth Forge is live" --csv recipients.csv [--dry-run]

  node scripts/email/send.mjs --to you@example.com --subject "Test" \\
       --text "Hello from the sender." 

Flags: --to --csv --template --text --text-file --subject --from --reply-to
       --tag --attach --var k=v --delay --limit --dry-run --check --help

Setup: copy scripts/email/.env.example to scripts/email/.env and set one of
RESEND_API_KEY / SENDGRID_API_KEY plus EMAIL_FROM.`;

/* ---------------------------------------------------------------- args --- */

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    let key = token.slice(2);
    let value;
    const eq = key.indexOf('=');
    if (eq !== -1) {
      value = key.slice(eq + 1);
      key = key.slice(0, eq);
    }
    if (value === undefined) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        value = next;
        i++;
      } else {
        value = true;
      }
    }
    if (args[key] === undefined) args[key] = value;
    else args[key] = [].concat(args[key], value);
  }
  return args;
}

/* ----------------------------------------------------------------- env --- */

function parseDotenv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadEnv() {
  const explicit = process.env.EMAIL_ENV_FILE;
  const file = explicit
    ? resolve(process.cwd(), explicit)
    : join(SCRIPT_DIR, '.env');
  if (!existsSync(file)) return { file, values: {} };
  const values = parseDotenv(readFileSync(file, 'utf8'));
  for (const [k, v] of Object.entries(values)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  return { file, values };
}

/* ----------------------------------------------------------------- csv --- */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const clean = rows.filter((r) => r.some((cell) => String(cell).trim() !== ''));
  if (clean.length < 2) return [];
  const header = clean.shift().map((h) => h.trim().toLowerCase());
  if (!header.includes('email')) {
    throw new Error(
      `CSV needs an "email" column. Found: ${header.join(', ') || '(none)'}`,
    );
  }
  return clean.map((r) =>
    Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])),
  );
}

/* -------------------------------------------------------------- render --- */

function render(input, vars) {
  const missing = new Set();
  const out = String(input).replace(
    /\{\{\s*([\w.-]+)\s*(?:\|([^}]*))?\}\}/g,
    (_m, key, fallback) => {
      const value = vars[key];
      if (value === undefined || value === null || value === '') {
        if (fallback !== undefined && fallback !== '') return fallback.trim();
        missing.add(key);
        return '';
      }
      return String(value);
    },
  );
  return { out, missing: [...missing] };
}

function splitAddress(raw) {
  const value = String(raw).trim();
  const match = value.match(/^(.*)<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() };
  }
  return { email: value };
}

/* ------------------------------------------------------------ provider --- */

function resolveProvider() {
  const forced = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
  if (forced === 'resend' || forced === 'sendgrid') return forced;
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SENDGRID_API_KEY) return 'sendgrid';
  return null;
}

function providerConfig(provider) {
  const from = splitAddress(process.env.EMAIL_FROM || '');
  const cfg = {
    provider,
    apiKey:
      provider === 'resend'
        ? process.env.RESEND_API_KEY
        : process.env.SENDGRID_API_KEY,
    fromRaw: process.env.EMAIL_FROM,
    fromEmail: from.email,
    fromName: from.name,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    baseUrl:
      provider === 'resend'
        ? 'https://api.resend.com'
        : 'https://api.sendgrid.com',
  };
  return cfg;
}

async function callApi(cfg, path, init = {}, attempt = 1) {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (res.status === 429 && attempt <= 3) {
    const retryAfter = Number(res.headers.get('retry-after') || 1);
    await sleep(Math.min(Math.max(retryAfter, 1), 30) * 1000);
    return callApi(cfg, path, init, attempt + 1);
  }

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 400) };
  }
  return {
    ok: res.ok,
    status: res.status,
    data,
    messageId: res.headers.get('x-message-id') ?? undefined,
  };
}

async function sendResend(cfg, message) {
  const body = {
    from: cfg.fromRaw,
    to: [message.to.email],
    subject: message.subject,
  };
  if (message.html) body.html = message.html;
  if (message.text) body.text = message.text;
  if (cfg.replyTo) body.reply_to = cfg.replyTo;
  if (message.tag) body.tags = [{ name: 'campaign', value: message.tag }];
  if (message.attachments?.length) body.attachments = message.attachments;

  const res = await callApi(cfg, '/emails', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return {
    ok: res.ok,
    status: res.status,
    id: res.data.id,
    error: res.ok
      ? undefined
      : res.data.message || res.data.name || JSON.stringify(res.data).slice(0, 300),
  };
}

async function sendSendgrid(cfg, message) {
  const body = {
    personalizations: [
      {
        to: [
          message.to.name
            ? { email: message.to.email, name: message.to.name }
            : { email: message.to.email },
        ],
      },
    ],
    from: { email: cfg.fromEmail },
    subject: message.subject,
    content: [],
  };
  if (cfg.fromName) body.from.name = cfg.fromName;
  if (cfg.replyTo) body.reply_to = { email: cfg.replyTo };
  if (message.text) body.content.push({ type: 'text/plain', value: message.text });
  if (message.html) body.content.push({ type: 'text/html', value: message.html });
  if (!body.content.length) body.content.push({ type: 'text/plain', value: ' ' });
  if (message.attachments?.length) body.attachments = message.attachments;
  if (message.tag) body.categories = [message.tag];

  const res = await callApi(cfg, '/v3/mail/send', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const errors = res.data?.errors
    ?.map((e) => `${e.field ?? ''} ${e.message ?? ''}`.trim())
    .join('; ');
  return {
    ok: res.ok,
    status: res.status,
    id: res.messageId,
    error: res.ok ? undefined : errors || JSON.stringify(res.data).slice(0, 300),
  };
}

async function checkProvider(cfg) {
  if (cfg.provider === 'resend') {
    const res = await callApi(cfg, '/domains');
    if (!res.ok) {
      console.log(`✗ Resend key rejected (${res.status}): ${res.data.message || ''}`);
      return false;
    }
    const domains = res.data?.data ?? [];
    console.log(`✓ Resend key valid — ${domains.length} domain(s) on this account`);
    for (const d of domains) {
      console.log(`  • ${d.name}  status=${d.status}  region=${d.region ?? 'n/a'}`);
    }
    const from = splitAddress(process.env.EMAIL_FROM || '').email;
    const match = domains.find((d) => from.endsWith(`@${d.name}`));
    if (!from) {
      console.log('  ! EMAIL_FROM is not set');
      return false;
    }
    if (!match) {
      console.log(
        `  ! ${from} does not belong to a verified domain — sends will fail until verified`,
      );
      return false;
    }
    console.log(
      match.status === 'verified'
        ? `  ✓ ${from} can send`
        : `  ! domain ${match.name} is "${match.status}" — verify DNS first`,
    );
    return match.status === 'verified';
  }

  const res = await callApi(cfg, '/v3/scopes');
  if (!res.ok) {
    console.log(
      `✗ SendGrid key rejected (${res.status}): ${JSON.stringify(res.data).slice(0, 200)}`,
    );
    return false;
  }
  console.log(
    `✓ SendGrid key valid — ${res.data?.scopes?.length ?? 0} scopes granted`,
  );
  console.log('  (sender identity is verified under Settings → Sender Authentication)');
  return true;
}

/* ---------------------------------------------------------------- misc --- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function localPath(p) {
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

async function attachmentsFrom(paths) {
  const list = [];
  for (const p of paths) {
    const file = localPath(p);
    if (!existsSync(file)) throw new Error(`Attachment not found: ${p}`);
    const buf = await readFile(file);
    list.push({
      filename: file.split(/[\\/]/).pop(),
      content: buf.toString('base64'),
    });
  }
  return list;
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/* ---------------------------------------------------------------- main --- */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return 0;
  }

  const { file: envFile, values: envValues } = loadEnv();
  if (Object.keys(envValues).length === 0 && !process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
    console.error(`No credentials found.\n  Looked for: ${envFile}`);
    console.error('  Copy scripts/email/.env.example → scripts/email/.env and fill it in.');
    return 2;
  }

  const provider = resolveProvider();
  if (!provider) {
    console.error('Set RESEND_API_KEY or SENDGRID_API_KEY (or EMAIL_PROVIDER=resend|sendgrid).');
    return 2;
  }
  const cfg = providerConfig(provider);

  if (args.check) {
    const ok = await checkProvider(cfg);
    if (!cfg.fromEmail) console.error('\nEMAIL_FROM is missing (e.g. "Growth Forge <hello@yourdomain>" ).');
    return ok && cfg.fromEmail ? 0 : 1;
  }

  if (!process.env.EMAIL_FROM) {
    console.error('EMAIL_FROM is required, e.g. "Growth Forge <hello@yourdomain>"');
    return 2;
  }
  if (!cfg.fromEmail || !EMAIL_RE.test(cfg.fromEmail)) {
    console.error(`EMAIL_FROM is not a usable address: ${process.env.EMAIL_FROM}`);
    return 2;
  }

  if (!args.subject) {
    console.error('--subject is required');
    return 2;
  }

  // Global variables: --var k=v (repeatable, later wins)
  const globalVars = {};
  for (const entry of [].concat(args.var ?? [])) {
    const eq = entry.indexOf('=');
    if (eq === -1) {
      console.error(`--var expects k=v, got: ${entry}`);
      return 2;
    }
    globalVars[entry.slice(0, eq).trim()] = entry.slice(eq + 1);
  }

  // Body
  let htmlTemplate = '';
  if (args.template) {
    const file = localPath(args.template);
    if (!existsSync(file)) {
      console.error(`Template not found: ${args.template}`);
      return 2;
    }
    htmlTemplate = await readFile(file, 'utf8');
  }
  let textTemplate = '';
  if (args['text-file']) {
    const file = localPath(args['text-file']);
    if (!existsSync(file)) {
      console.error(`Text file not found: ${args['text-file']}`);
      return 2;
    }
    textTemplate = await readFile(file, 'utf8');
  } else if (typeof args.text === 'string') {
    textTemplate = args.text;
  }
  if (!htmlTemplate && !textTemplate) {
    console.error('Provide a body: --template <html> and/or --text / --text-file');
    return 2;
  }

  // Recipients
  let recipients = [];
  if (args.csv) {
    const file = localPath(args.csv);
    if (!existsSync(file)) {
      console.error(`CSV not found: ${args.csv}`);
      return 2;
    }
    recipients = parseCsv(await readFile(file, 'utf8')).map((row) => ({
      email: (row.email || '').toLowerCase(),
      name: row.name || '',
      vars: row,
    }));
  }
  if (args.to) {
    for (const addr of [].concat(args.to).flatMap((v) => String(v).split(','))) {
      const clean = addr.trim();
      if (!clean) continue;
      const parsed = splitAddress(clean);
      recipients.push({ email: parsed.email.toLowerCase(), name: parsed.name || '', vars: {} });
    }
  }

  // Dedupe + validate
  const seen = new Set();
  const valid = [];
  for (const r of recipients) {
    if (!r.email) continue;
    if (!EMAIL_RE.test(r.email)) {
      console.warn(`  skip invalid address: ${r.email}`);
      continue;
    }
    if (seen.has(r.email)) {
      console.warn(`  skip duplicate: ${r.email}`);
      continue;
    }
    seen.add(r.email);
    valid.push(r);
  }
  if (!valid.length) {
    console.error('No valid recipients. Pass --to and/or --csv with an "email" column.');
    return 2;
  }

  const limit = args.limit ? Number(args.limit) : Infinity;
  const targets = valid.slice(0, limit);
  const delay = args.delay ? Number(args.delay) : 400;
  const dryRun = Boolean(args['dry-run']);
  const attachments = await attachmentsFrom([].concat(args.attach ?? []).filter((a) => typeof a === 'string'));
  const tag = typeof args.tag === 'string' ? args.tag : undefined;

  console.log(
    `${dryRun ? 'DRY RUN — ' : ''}${provider} → ${targets.length} recipient(s)` +
      (valid.length > targets.length ? ` (of ${valid.length})` : ''),
  );
  console.log(`from: ${process.env.EMAIL_FROM}`);
  console.log(`attachment(s): ${attachments.map((a) => a.filename).join(', ') || 'none'}`);

  await mkdir(LOG_DIR, { recursive: true });
  const stamp = timestamp();
  const logFile = join(LOG_DIR, `${dryRun ? 'dryrun' : 'send'}-${stamp}.jsonl`);
  const results = [];

  for (const [index, r] of targets.entries()) {
    const vars = { ...globalVars, ...r.vars, email: r.email, name: r.name || r.vars.name || '' };
    const subjectR = render(args.subject, vars);
    const htmlR = htmlTemplate ? render(htmlTemplate, vars) : { out: '', missing: [] };
    const textR = textTemplate ? render(textTemplate, vars) : { out: '', missing: [] };

    const unresolved = new Set([...subjectR.missing, ...htmlR.missing, ...textR.missing]);
    if (unresolved.size) {
      const msg = `unresolved placeholder(s): ${[...unresolved].join(', ')}`;
      if (dryRun) console.warn(`  ! ${r.email} ${msg}`);
    }

    const message = {
      to: { email: r.email, name: r.name },
      subject: subjectR.out,
      html: htmlR.out || undefined,
      text: textR.out || undefined,
      attachments,
      tag,
    };

    if (dryRun) {
      results.push({ email: r.email, status: 'dry-run', unresolved: [...unresolved] });
      if (index === 0 && args.out) {
        const outFile = localPath(args.out);
        await writeFile(outFile, message.html || message.text, 'utf8');
        console.log(`rendered first message → ${outFile}`);
      }
      if (index === 0) {
        console.log('\n--- resolved first message ---');
        console.log(`subject: ${message.subject}`);
        console.log(`html bytes: ${(message.html || '').length}`);
        console.log(`text bytes: ${(message.text || '').length}`);
        console.log('------------------------------\n');
      }
      continue;
    }

    let result;
    try {
      result =
        provider === 'resend'
          ? await sendResend(cfg, message)
          : await sendSendgrid(cfg, message);
    } catch (err) {
      result = { ok: false, status: 0, error: err.message };
    }

    results.push({
      email: r.email,
      ...result,
      resolvedSubject: message.subject,
      unresolved: [...unresolved],
    });
    await appendFile(
      logFile,
      JSON.stringify({
        at: new Date().toISOString(),
        to: r.email,
        subject: message.subject,
        provider,
        ...result,
        unresolved: [...unresolved],
      }) + '\n',
    );

    const label = result.ok ? '✓' : '✗';
    console.log(`  ${label} ${r.email}${result.ok ? `  id=${result.id ?? 'n/a'}` : `  ${result.status} ${result.error ?? ''}`}`);

    if (index < targets.length - 1) await sleep(delay);
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok && r.status !== 'dry-run').length;

  if (dryRun) {
    await appendFile(logFile, JSON.stringify({ at: new Date().toISOString(), dryRun: true, results }) + '\n');
    console.log(`\nDry run complete — ${results.length} message(s) would send. Nothing was sent.`);
    console.log(`log: ${logFile}`);
    return 0;
  }

  console.log(`\n${sent} sent, ${failed} failed.`);
  console.log(`log: ${logFile}`);
  return failed ? 1 : 0;
}

main()
  .then((code) => {
    // Set the code rather than calling process.exit(): exiting while undici's
    // handles are still closing trips a libuv assertion on Windows.
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(`error: ${err.message}`);
    process.exitCode = 1;
  });
