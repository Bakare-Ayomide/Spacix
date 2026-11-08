# Operations & Deployment Runbook (`docs/runbook.md`)

## 1. Environment Boot Check
`src/server/env.ts` validates all environment variables at startup.
- **Higgsfield API**: Set `HF_CREDENTIALS="key_id:key_secret"` from `console.higgsfield.ai` and `HF_WEBHOOK_SECRET` to a 32-byte random hex string.
- **Webhooks in Local Dev**: Run `cloudflared tunnel --url http://localhost:3000` and set `HF_WEBHOOK_BASE_URL` to the public tunnel URL. If `HF_WEBHOOK_BASE_URL` is blank, the background reconciler (`GET /api/cron/reconcile`) automatically polls and finalizes runs.
- **Stripe Webhooks**: Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

## 2. Reconciler & Stuck Generations
- Endpoint: `GET /api/cron/reconcile` with header `Authorization: Bearer ${CRON_SECRET}`.
- Runs older than 2 minutes in `pending_submit` or 3 minutes in `queued`/`in_progress` are re-fetched from Higgsfield and finalized idempotently.
- Runs unfinished after 15 minutes are automatically marked `failed` and refunded via `credit_ledger` (`reason: "generation_refund"`).

## 3. Adding a New Model
1. Add the model entry and `toPlatform` mapper in `src/catalog/models.ts` with its `docs.higgsfield.ai` source URL comment.
2. Verify `priceFor(modelId, settings, media)` in `src/billing/price.ts`.
3. Run `npm run lint && npm run build` to verify strict TypeScript types across client and server.
