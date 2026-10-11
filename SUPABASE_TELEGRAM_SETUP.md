# ArzonMarket: Supabase + Vercel + Telegram admin

## 1. Supabase database
The SQL schema has already been run for this project. It creates the `products`, `users`, `orders`, and `telegram_product_drafts` tables and the public `product-images` storage bucket. Do not rerun it unless the schema is intentionally changed.

## 2. Vercel environment variables
In Vercel -> project `arzonmarket` -> Settings -> Environment Variables, add these for Production (and Preview if you will test previews):
- `SUPABASE_URL` = `https://trmgpwwgeylxcvsquxwp.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = the Supabase service-role/secret key. Keep it server-only; never use a `VITE_` prefix.
- `TELEGRAM_BOT_TOKEN` = token from BotFather.
- `TELEGRAM_ADMIN_IDS` = the numeric Telegram user ID of the one allowed admin. Do not put `@mehrvar_01` here; the allowlist must use the numeric ID.
- `TELEGRAM_WEBHOOK_SECRET` = a long random secret string.

The product catalog endpoint is a Vercel serverless function at `/api/products` and reads active products directly from Supabase. The React client uses `/api` automatically in production, so `VITE_API_URL` is not required for product browsing. Redeploy after changing environment variables.

## 3. Restrict bot access to the intended Telegram account
1. In Telegram, open a trusted user-ID bot such as `@userinfobot` and get the numeric ID for the intended admin account `@mehrvar_01`.
2. Put only that numeric ID in `TELEGRAM_ADMIN_IDS`. Never use the username as the security check; usernames can change.
3. Set the Telegram webhook to:
   `https://arzonmarket-omega.vercel.app/api/telegram-webhook`
   Configure the webhook with the same `TELEGRAM_WEBHOOK_SECRET` value as Telegram's `secret_token`.
4. After the Vercel deployment is ready, open your store bot in Telegram and send `/start`.

## 4. Add a product in Telegram
Send `/add`, then answer the bot prompts for product name, brand, category, price, stock, description, and a direct HTTPS image URL (or `—` to skip the description/photo). When the bot confirms success, it has inserted the product into Supabase with `is_active=true`; the storefront's `/api/products` endpoint reads that same table, so the product can appear in the catalog. Use `/products` to see the latest entries and `/cancel` to stop.

## 5. Security and remaining limitations
- Never place `SUPABASE_SERVICE_ROLE_KEY` in frontend code, a `VITE_*` variable, or GitHub.
- The Telegram bot currently accepts product images by HTTPS URL, not as Telegram photo attachments.
- This change connects the storefront product list and Telegram product creation to Supabase. Other customer login/order API routes still need their own Vercel-compatible deployment before claiming the whole store is production-ready.
- Phone-code login currently does not send SMS and is not ready for real customers until an SMS provider and persistent, rate-limited verification are configured.
