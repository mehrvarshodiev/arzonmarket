# ArzonMarket: Supabase and Telegram setup

## 1. Database schema
1. Open https://supabase.com/dashboard and select the project **arzon market**.
2. Open **SQL Editor** -> **New query**.
3. Copy the complete contents of `supabase/schema.sql` from this branch in GitHub, paste into SQL Editor, then press **Run**.
4. The script is designed to be re-runnable. It creates the `users` table required by the API in addition to products, orders, Telegram drafts, and the public product-images bucket.
5. Confirm that the Tables page shows `products`, `users`, `orders`, and `telegram_product_drafts`.

## 2. API server environment
The Express API in `server/` is a separate Node.js service; deploying the static React client on Vercel does not by itself deploy this API. Deploy the `server/` directory to a Node.js host that supports long-running Express apps, and set these server-only environment variables there:
- `SUPABASE_URL`: the project URL (for this project: `https://trmgpwwgeylxcvsquxwp.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY`: the Supabase secret/service-role key. Never expose it in the browser or commit it.
- `JWT_SECRET`: a long, random secret used to sign login tokens.
- `CLIENT_ORIGIN`: the exact storefront origin, e.g. `https://arzonmarket-omega.vercel.app`.
- `TELEGRAM_BOT_TOKEN`: optional, for order notifications and Telegram sign-in.
- `TELEGRAM_CHAT_ID`: optional chat ID for order notifications.

After deployment, open `https://YOUR-API-HOST/api/health`; it should return JSON with `"status":"ok"` and `"database":"connected"`.

## 3. Connect the storefront to the API
In the Vercel project serving `client/`, set:
- `VITE_API_URL`: the full API base URL ending in `/api`, e.g. `https://YOUR-API-HOST/api`.
- `VITE_TELEGRAM_BOT_USERNAME`: optional bot username without the @ symbol if Telegram login is configured.

Redeploy the frontend after setting or changing `VITE_API_URL`.

## 4. Telegram product-management webhook
The serverless webhook is `client/api/telegram-webhook.js`. For that function on Vercel, configure:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_IDS`: comma-separated numeric Telegram user IDs authorized to manage products
- `TELEGRAM_WEBHOOK_SECRET`: a long random string

Register `https://YOUR-VERCEL-DOMAIN/api/telegram-webhook` with Telegram's setWebhook API and set the same secret as `secret_token`.

## 5. Important readiness notes
- The phone-code route currently generates a code in server memory but does not send SMS. Real phone login is **not ready for customers** until an SMS provider and persistent, rate-limited verification flow are configured.
- Do not grant public read/write access to users, orders, or Telegram drafts. Server-side API access must use the secret key.
- Never use the service-role key in any `VITE_*` variable or frontend code.
- Do not merge this branch or enable production ordering until the API is deployed and tested end-to-end.
