# Supabase + Telegram admin setup

This folder documents the first integration stage for ArzonMarket.

## 1. Create the database
1. Create a Supabase project at https://supabase.com/dashboard.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Project Settings -> API, copy the Project URL and the service_role key. Never put the service role key in frontend code or commit it to GitHub.

## 2. Configure Vercel
Add these environment variables to the Vercel project serving the `client/` directory:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: secret service_role key (server-only)
- `TELEGRAM_BOT_TOKEN`: token from BotFather (server-only)
- `TELEGRAM_ADMIN_IDS`: comma-separated numeric Telegram user IDs allowed to manage products
- `TELEGRAM_WEBHOOK_SECRET`: a random secret string (recommended)

The webhook handler is `client/api/telegram-webhook.js`. After deployment, register the webhook URL:
`https://YOUR-VERCEL-DOMAIN/api/telegram-webhook`
Use Telegram's setWebhook API with `secret_token` set to the same value as `TELEGRAM_WEBHOOK_SECRET`.

## 3. Telegram commands
- `/start` or `/help`: help
- `/add`: interactive product creation (name, brand, category, price, stock, description, image URL)
- `/products`: latest products
- `/cancel`: cancel current product draft

## Security notes
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `TELEGRAM_BOT_TOKEN` in `VITE_*` variables or browser code.
- The bot checks `TELEGRAM_ADMIN_IDS` before reading or changing catalog data.
- Public catalog reads are restricted to active products through Row Level Security.
- This is an initial scaffold. The existing React storefront still needs its product API switched to Supabase (including field-name compatibility) before catalog changes made by Telegram appear on the live site.
