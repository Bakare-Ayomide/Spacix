# Architectural & Product Decisions (`docs/decisions.md`)

## 1. Brand & Placeholders
- **BRAND_NAME**: `Lumen` (`Lumen Studio`)
- **APP_SLUG**: `lumen-studio`
- **PRODUCTION_URL**: `https://lumen.studio`
- **EMAIL_FROM**: `Lumen <login@lumen.studio>`
- **SUPPORT_EMAIL**: `support@lumen.studio`
- **CREDIT_MARKUP**: `2.0` (2× Higgsfield USD API cost, with `CREDIT_USD_VALUE = $0.01`)
- **SIGNUP_BONUS_CREDITS**: Defaulted to `250` credits in development/preview so new magic-link accounts can immediately test Image, Video, and Audio models before purchasing a Stripe plan or top-up.

## 2. API Host & Client Strategy
- **Disagreement**: `higgsfield-ai/app-templates` uses `https://platform.higgsfield.ai`, while `https://docs.higgsfield.ai` and `/docs/openapi.json` specify `https://api.higgsfield.ai`.
- **Decision**: Default `HF_API_BASE_URL` to `https://api.higgsfield.ai` per rule #3 ("live docs win for API behavior"). We use a thin, typed `fetch` client on the server (`src/server/higgsfield.ts`) with exponential backoff + jitter on 429/5xx, `Authorization: Key {key_id}:{key_secret}`, and constant-time HMAC-SHA256 verification on `/api/webhooks/higgsfield`.
- **Dual-Mode Execution**: When `HF_CREDENTIALS` is configured in the environment, requests hit `https://api.higgsfield.ai/{model-path}` directly. When `HF_CREDENTIALS` is not set in local/preview environments, the server executes the exact same validation, credit debit transaction, queued -> in_progress -> completed lifecycle, and synthesizes media via the server-side Gemini API / procedural cinema engine so every control works end-to-end without error.

## 3. Credit Buckets & Concurrency
- **Two Credit Buckets**:
  - `subscription`: Reset (not accumulated) to the plan's monthly allowance upon each paid subscription cycle (`invoice.paid`). Consumed first before `topup` credits.
  - `topup`: Purchased via one-time Stripe Checkout packs; never expire. Consumed only after `subscription` credits reach `0`.
- **Idempotency**: Every credit mutation writes to `credit_ledger` keyed by unique `{ reason, refType, refId }`. Duplicate webhook deliveries or concurrent finalizers cannot double-debit or double-refund.
- **Parallel Generation Limits**:
  - Free: 1 video / 2 image / 2 audio concurrent runs
  - Starter: 2 video / 4 image / 4 audio concurrent runs
  - Plus: 6 video / 8 image / 6 audio concurrent runs
  - Ultra: 12 video / 16 image / 12 audio concurrent runs

## 4. Template License Note
- `higgsfield-ai/app-templates` is published as a public shadcn registry for scaffolding applications on the Higgsfield API. Attribution comments are preserved and zero Higgsfield brand marks, logos, or proprietary marketing media are used.
