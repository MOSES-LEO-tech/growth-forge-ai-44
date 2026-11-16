# Email sending (Resend / SendGrid)

One dependency-free Node script that sends the app's launch, onboarding and
campaign email. Everything stays local or on the provider — no MCP, no SDK, no
bundle bloat.

```
scripts/email/
├── send.mjs                  # the sender
├── .env.example              # copy to .env, add one API key
├── templates/launch.html     # branded launch email ({{placeholders}})
├── recipients.example.csv    # recipient list format
└── logs/                     # per-run JSONL receipts (gitignored)
```

## 1. Get a key (5 min)

Pick one provider.

**Resend** — `resend.com` → *Domains* → *Add Domain* → paste the DKIM + SPF
records into your DNS → wait for `verified` (usually under 15 minutes) →
*API Keys* → *Create* with **Sending access** only. Free tier: 3,000/month,
100/day.

**SendGrid** — `sendgrid.com` → *Settings → Sender Authentication* → verify a
domain → *Settings → API Keys* → *Create* with **Mail Send** restricted scope.
Free tier: 100/day.

## 2. Configure

```bash
cd "D:/Projects/Personal projects/growth-forge-ai-44"
cp scripts/email/.env.example scripts/email/.env
# edit scripts/email/.env: EMAIL_FROM + the key
```

`.env*` is already gitignored repo-wide, so the key never reaches git. Do not
rename the keys with a `VITE_` prefix — that would ship them to the browser.

## 3. Verify before sending

```bash
node scripts/email/send.mjs --check
```

Prints whether the key is valid, which domains are on the account, and whether
`EMAIL_FROM` belongs to a verified one. Never send a real campaign before this
passes.

## 4. Dry run, then send

```bash
# resolve templates, validate recipients, send nothing
node scripts/email/send.mjs \
  --template scripts/email/templates/launch.html \
  --subject "Milestone is live" \
  --csv scripts/email/recipients.example.csv \
  --var cta_url=https://growthforge.ai \
  --dry-run

# one real email to yourself
node scripts/email/send.mjs \
  --to you@yourdomain.com \
  --subject "Sender test" \
  --text "If you can read this, sending works."

# the campaign
node scripts/email/send.mjs \
  --template scripts/email/templates/launch.html \
  --subject "{{name}}, your growth workspace is ready" \
  --csv scripts/email/recipients.csv \
  --tag launch-2026-11 \
  --delay 500
```

## Template variables

`{{key}}` is replaced from, in priority order: the CSV row, then `--var k=v`.
`{{key|fallback}}` supplies a default, so a template renders safely even when a
column is missing. Unresolved placeholders (no value, no fallback) are listed in
the dry run and recorded per-recipient in the log.

## Behaviour

- Dedupes recipients (case-insensitive) and skips malformed addresses.
- 400 ms between sends by default (`--delay`); retries a `429` up to 3 times
  using `Retry-After`.
- Writes `logs/send-<timestamp>.jsonl`, one line per recipient with provider
  message id or the exact error; the provider dashboard is the delivery truth.
- Exit code `1` if any send failed — safe to use in CI or cron.
- Attachments: `--attach path.pdf` (repeatable, base64-encoded inline).

## Sending at volume, later

This script is for hundreds, not hundreds of thousands. Past ~1k/batch, move to
Resend Broadcasts (or SendGrid Marketing Campaigns) so the provider handles
unsubscribe lists, bounces and throttling. The HTML template here drops into
either without changes.
