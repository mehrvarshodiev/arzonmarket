// Vercel maps this file directly to /api/auth/telegram/challenge.
// Reuse the shared auth handler, which dispatches by the request URL.
export { default } from "../[...path].js";
