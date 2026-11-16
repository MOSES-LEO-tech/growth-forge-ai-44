# Billing — MVP design (Phase 5)

Status: **design + schema only.** No Paddle account exists yet, no webhook is
deployed, and `parent.ts:getPlan()` still returns a constant. Nothing here charges
anyone until Phase 5c is executed.

## 1. What the MVP sells

| Plan | Who | Price (display) | Charged as | SmartBuddy / month | Storage | Extras |
|---|---|---|---|---|---|---|
| **Free** | everyone | UGX 0 | — | 20 messages | 100 MB | 1 portfolio, school join by code |
| **Student Plus** | student | UGX 15,000 / mo · UGX 150,000 / yr | **USD 3.99 / 39.99** | 300 messages | 2 GB | Priority AI model, CV export |
| **School** | school admin | UGX 12,000 / student / yr (min 50 students) | **USD 3.20 / student / yr** | Unlimited for staff, 40/student | 100 GB pooled | CMS, announcements, academics, moderation |

Free tier is deliberately generous enough for a whole classroom to try the product;
the paywall sits on *volume* (AI messages) and *space* (storage), not on features a
teacher needs to evaluate the product.

## 2. The currency constraint you need to know

Paddle publishes **33 payment currencies**; **UGX is not among them** (verified
against `developer.paddle.com/concepts/sell/supported-currencies` on 2026-11-10 —
the table lists 25 of 33 rows and UGX is absent; confirm again at signup). Paddle
also **does** accept Uganda-based sellers: Uganda is not in their
unsupported-countries list.

So the practical model is:

- **Prices are authored in USD in Paddle** (the settlement currency).
- **The UI displays UGX** using an admin-editable rate in `settings`
  (`billing.ugx_per_usd`), refreshed monthly. A Ugandan parent sees
  "UGX 15,000/month", Paddle charges the USD equivalent.
- The displayed UGX is a **quote, not a charge**. The checkout page is Paddle's and
  shows the authoritative amount. That must be stated in the UI so nobody feels
  misled by a moving exchange rate.

If true UGX settlement and mobile-money collection matter more than merchant-of-record
tax handling, Paystack/Flutterwave are the alternative — they settle locally but you
become the merchant and own the tax/VAT burden.

## 3. Entitlements and metering

Schema: `supabase/migrations/20261110100000_billing_entitlements.sql`
(`billing_customers`, `subscriptions`, `entitlements`, `usage_counters`,
`billing_events`, plus `current_entitlement()`).

- **Period** = UTC calendar month, matching `smartbuddy_usage`.
- **Source of truth for usage**: `usage_counters` (fast check) backed by
  `smartbuddy_usage` rows (audit trail). The Edge Function increments the counter
  and refuses the call when `used >= cap`.
- **Storage** is a standing cap, recomputed from `storage.objects` on write, not a
  monthly reset.
- **Clients can read their entitlement, never write it.** RLS grants `select` on
  own rows only; every write comes from the webhook with the service role. An
  entitlement a browser can grant itself is not an entitlement.

## 4. Paddle integration shape

```
Browser ──(1) POST /functions/v1/create-checkout──► Edge Function
                                                     │ Paddle API: create transaction
        ◄──(2) transaction id ───────────────────────┘
Browser ──(3) Paddle.js Checkout (overlay) ──► Paddle (card, tax, invoice)
                                                     │
Paddle ──(4) POST /functions/v1/paddle-webhook ──────┘  (signature-verified)
                │ upsert subscription + entitlement
                ▼
        billing_events (idempotent) → subscriptions → entitlements
```

Events that must be handled, in order of importance:

| Event | Effect |
|---|---|
| `subscription.created` | create `subscriptions` row, grant entitlement for the period |
| `subscription.updated` | status/period/price changes; downgrade on `canceled` at `current_period_end` |
| `subscription.canceled` | keep entitlement until period end, then fall back to free |
| `transaction.completed` | audit/finance record; do not grant twice |
| `transaction.payment_failed` | mark `past_due`, keep access for a grace window |

Non-negotiables for the webhook:

1. **Verify the signature** (`Paddle-Signature` header, HMAC-SHA256 over the raw
   body, timestamp tolerance) before parsing anything.
2. **Idempotency on `event_id`** via `billing_events` primary key — Paddle retries
   for up to three days.
3. **Return 2xx fast**, do the DB work before responding, no long AI calls.
4. **Never trust the payload's user id** — map `paddle_customer_id` to
   `billing_customers.user_id`, which only the server writes.

## 5. Abuse prevention

| Vector | Control |
|---|---|
| Free-tier farm (new account per 20 messages) | Cap by `auth.users.created_at` + school membership; one free entitlement per verified email domain per month |
| Message flooding | Per-minute rate limit in the Edge Function (e.g. 10/min) on top of the monthly cap |
| Storage abuse | Byte quota enforced server-side on upload; MIME allowlist per bucket |
| Prompt bloat | Existing 4,000-char message cap stays |
| Card testing | Paddle owns fraud screening; never accept raw card data |
| Quota bypass via direct RPC | `current_entitlement()` is `security invoker`; caps are re-checked in the function, not the UI |

## 6. Implementation order

**5a — schema (ready now).** Apply `20261110100000_billing_entitlements.sql`.
No behaviour change; nothing reads it yet.

**5b — metering (no Paddle needed).** Enforce the free-tier caps in
`smartbuddy-chat`: call `current_entitlement()`, insert into `usage_counters`,
return HTTP 402 with the upgrade link when exhausted. This is valuable before any
payment exists — it stops unbounded LLM spend.

**5c — payments (needs the account).** Paddle products/prices → `create-checkout`
→ `paddle-webhook` → replace the hardcoded `getPlan()` with a read of
`current_entitlement()`.

**5d — school invoicing.** Until per-student billing is automated, invoice schools
manually in Paddle and set their `subscriptions` row by hand.

## 7. Paddle signup — concrete steps

1. Create an account at <https://paddle.com> (sandbox first: *Paddle Sandbox*).
2. Business verification: Uganda-based sellers are accepted; expect to provide
   incorporation/registration, a bank account, and a tax ID. Payouts run through
   Payoneer/Wise-style rails — confirm the Uganda payout path during onboarding.
3. In **Paddle > Catalog**, create two products (Student Plus, School) with
   **USD** prices; add annual and monthly price ids.
4. Set the balance currency to USD (*Settings > Currencies*).
5. Create the webhook destination pointing at
   `https://tobclczszdikmgvkvngf.supabase.co/functions/v1/paddle-webhook`, subscribe
   it to the five events above, and copy the signing secret.
6. Store `PADDLE_API_KEY` and `PADDLE_WEBHOOK_SECRET` as **Supabase Edge Function
   secrets** — never Vercel, never a `VITE_` variable.
7. Verify in sandbox with Paddle's test cards before touching production prices.

## 8. Decisions still open

| # | Decision | Default if you say nothing |
|---|---|---|
| 1 | USD settlement accepted (UGX display only), or switch to a UGX-settling vendor | USD settlement |
| 2 | School pricing per-student vs flat annual fee | per student, min 50 |
| 3 | Free trial (7 days of Student Plus) vs free tier only | free tier only |
| 4 | Annual discount size | 2 months free (~17 %) |
| 5 | Which models Plus unlocks (cost lever) | same model, higher cap |

## 9. Risks

- **FX drift** between the displayed UGX quote and the USD charge — mitigate with a
  monthly rate refresh and explicit "charged in USD" copy.
- **Webhook downtime** silently strands subscriptions — add a daily reconciliation
  job against Paddle's API before real revenue exists.
- **Free-tier model choice**: today's models are `:free` OpenRouter variants; the
  moment volume grows, per-message cost stops being zero and the caps in §1 must be
  re-derived from real token costs in `smartbuddy_usage`.
