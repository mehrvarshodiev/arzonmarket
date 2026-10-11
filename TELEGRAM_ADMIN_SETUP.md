# ArzonMarket — Telegram admin bot (MongoDB Atlas)

This integration keeps the existing Express/Mongoose product schema and writes directly to the same MongoDB database used by the API. It is deployed as a Vercel Function in `client/api/telegram-webhook.js`.

## Vercel environment variables
Set these in the existing `arzonmarket` Vercel project (Production and Preview as appropriate):
- `MONGO_URI`: the same MongoDB Atlas connection string used by the existing Express API. Use a database user with access only to the ArzonMarket database.
- `MONGO_DB_NAME`: `arzonmarket` (optional; this is the default).
- `TELEGRAM_BOT_TOKEN`: token from Telegram's official @BotFather.
- `TELEGRAM_ADMIN_IDS`: comma-separated numeric Telegram user ID(s) allowed to manage products.
- `TELEGRAM_WEBHOOK_SECRET`: a long random value; use the same value when registering the webhook.

Do not prefix secrets with `VITE_`, put them in frontend code, or commit them to GitHub.

## Register the webhook
After the branch is merged and deployed, set the webhook to:
`https://arzonmarket-omega.vercel.app/api/telegram-webhook`

Call Telegram's `setWebhook` method with:
- `url`: the URL above
- `secret_token`: the same value as `TELEGRAM_WEBHOOK_SECRET`

You can call the Bot API method using a secure tool or server-side script. Do not post the bot token in chat.

## Commands
- `/start` or `/help`: help
- `/add`: add a product step by step
- `/products`: list the latest 10 products
- `/cancel`: cancel the current draft

## Product fields
Writes `name`, `description`, `price`, `oldPrice`, `category`, `brand`, `images`, `specs`, `featured`, `stock`, `createdAt`, and `updatedAt`, matching the current Mongoose Product model.

## Important status
This is an initial webhook scaffold, not yet verified against a live Telegram bot or a configured Atlas database. The existing site API must point to the same Atlas database. If the Express API currently uses a different database name, set `MONGO_DB_NAME` to that exact name.
