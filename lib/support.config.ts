import { KB } from "./agent/kb";
import type { SupportConfig } from "./support-kit/types";

export const SUPPORT: SupportConfig = {
  productSlug: "schemasafe",
  productName: "SchemaSafe",
  feedbackEmail: process.env.FEEDBACK_TO_EMAIL || "lixingliangsy@163.com",
  kb: KB,
  chatHost: process.env.APP_URL || "https://schemasafe.lxsaihub.com",
  brandColor: "#0891B2",
  complianceDisclaimer: "This assistant answers JSON Schema validation questions from the product knowledge base; it is not legal or professional advice. Honesty guardrail: SchemaSafe only reports whether your data matches the schema you declared - it does not guarantee the schema itself is correct and it does not repair your data.",
};
