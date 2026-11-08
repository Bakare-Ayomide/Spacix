# Lumen Studio (`lumen-studio`)

Production-grade AI Image, Video, and Audio generation studio built on the Higgsfield API, credit ledger, Stripe billing, and Cloudflare R2 media archival.

## 1. Quick Start & Local Development

1. Copy `.env.example` to `.env` and fill in your credentials:
   - `HF_CREDENTIALS="key_id:key_secret"` from `console.higgsfield.ai`
   - `HF_WEBHOOK_SECRET` for HMAC-SHA256 webhook verification
   - `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
2. Start the full-stack development server (port 3000):
   ```bash
   npm run dev
   ```
3. Run typecheck and production build verification:
   ```bash
   npm run lint && npm run build
   ```

## 2. Local Webhooks & Reconciler
- **Stripe CLI**:
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```
- **Higgsfield Webhook Tunnel**:
  ```bash
  cloudflared tunnel --url http://localhost:3000
  ```
  Set `HF_WEBHOOK_BASE_URL` to the public tunnel URL. When `HF_WEBHOOK_BASE_URL` is empty in local dev, `/api/cron/reconcile` and the status poller automatically finalize runs.

## 3. Adding a New Verified Model
1. Open `src/catalog/models.ts` and add a `ModelEntry` object with its `docs.higgsfield.ai` source URL comment and `toPlatform` request mapper.
2. Verify pricing in `src/billing/price.ts` (`priceFor(modelId, settings, media)`).
3. Document the model in `docs/model-catalog.md`.
