---
name: Infrastructure & Deployment
description: Key infra details for FIRE Station — Supabase project, Stripe, Vercel, env vars
type: project
originSessionId: 306780e8-302b-47fe-a1cc-6e2b824c3bba
---
## Supabase
- Project ID: `spuscfciwwjncmylddqp`
- Region: Japan (ap-northeast-1) — PDPA note: data outside Singapore, acceptable for now
- CLI path: `/opt/homebrew/bin/supabase`
- Edge Functions deployed: `create-checkout-session`, `stripe-webhook`
- Secrets set: `STRIPE_WEBHOOK_SECRET` (whsec_...), `STRIPE_SECRET_KEY` (to be verified)

## Stripe
- Mode: live (not test) — real Price IDs in use
- Webhook endpoint: registered in Stripe dashboard pointing to `stripe-webhook` Edge Function
- Customer portal: not yet integrated (currently redirects to `/settings`)

## Vercel
- Production deployment triggered by push to `main`
- Security headers defined in `vercel.json`
- Env vars needed: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_KEY`

## GitHub
- Repo: github.com/zombiewoman539/fire-station-ai
- Branch: main (single branch, push directly)

## Local dev
- `localhost` / `127.0.0.1` skips auth entirely (local-dev profile)
- Env vars in `goals-mapper/.env.local` (gitignored)
- Dev server: `npm start` from `goals-mapper/`
- Build: `CI=true npm run build`

**How to apply:** Use these details when deploying edge functions, setting secrets, or configuring new integrations.
