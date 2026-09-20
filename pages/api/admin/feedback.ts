import type { NextApiRequest, NextApiResponse } from "next";
import { getAdminFromRequest } from "../../../lib/auth";
import { listFeedback } from "../../../lib/feedback";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = getAdminFromRequest(req);
  if (!admin) return res.status(403).json({ error: "Admin access required", code: "FORBIDDEN" });
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const items = await listFeedback();
  return res.status(200).json({ ok: true, items });
}