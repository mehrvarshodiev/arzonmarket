import handler from "../../auth/[...path].js";

export default function telegramConfigHandler(req, res) {
  return handler(req, res);
}
