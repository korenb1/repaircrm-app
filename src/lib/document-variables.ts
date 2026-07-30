// Variable catalog for document templates. Each token is inserted verbatim
// into the editor as `{{token}}`; `renderTemplate` substitutes real ticket
// data for those tokens when a document is printed from a ticket card.
// Tokens are grounded in the DB schema (contacts / tickets / devices / profiles).

import { formatMoney, formatDate, formatDateTime } from "@/lib/money";
import { INTL_LOCALE, type Locale, DEFAULT_LOCALE } from "@/lib/i18n";
import { DEFAULT_CURRENCY } from "@/lib/i18n/currencies";
import type { TicketItem, TicketRow } from "@/lib/types";

// Template variable groups. Tokens are inserted verbatim as `{{token}}`.
// Group titles and per-token labels live in the i18n dictionaries
// (dict.variableGroups[key] and dict.variableGroups.vars[token]).
export type VariableGroupKey =
  | "company"
  | "client"
  | "order"
  | "device"
  | "finance"
  | "staff"
  | "date";

export interface VariableGroup {
  key: VariableGroupKey;
  tokens: string[];
}

export const VARIABLE_GROUPS: VariableGroup[] = [
  {
    key: "company",
    tokens: [
      "company.name",
      "company.address",
      "company.phone",
      "company.email",
      "company.logo",
      "company.info",
    ],
  },
  {
    key: "client",
    tokens: [
      "client.first_name",
      "client.last_name",
      "client.phone",
      "client.email",
      "client.address",
    ],
  },
  {
    key: "order",
    tokens: [
      "order.number",
      "order.status",
      "order.created_at",
      "order.due_date",
      "order.malfunction",
      "order.complectation",
      "order.device_state",
      "order.conclusion",
      "order.manager_notes",
    ],
  },
  {
    key: "device",
    tokens: [
      "device.group",
      "device.brand",
      "device.model",
      "device.modification",
      "device.sn_imei",
    ],
  },
  {
    key: "finance",
    tokens: [
      "finance.est_price",
      "finance.price",
      "finance.prepayment",
      "finance.paid",
      "finance.due",
    ],
  },
  {
    key: "staff",
    tokens: ["staff.manager", "staff.technician"],
  },
  {
    key: "date",
    tokens: ["date.today", "date.now"],
  },
];

// ── Substitution ───────────────────────────────────────────────────────────

export interface TemplateContext {
  ticket: TicketRow;
  items: TicketItem[];
  // Sum of recorded payments (payment + prepayment) for the ticket.
  paid: number;
  // Display currency + locale for money/date formatting (defaults: USD / en).
  currency?: string;
  locale?: Locale;
  // Org identity from company_settings; logoUrl is the resolved public URL.
  company?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    info?: string;
    logoUrl?: string | null;
  };
}

// Escapes free-text so it is safe inside the printed HTML, then turns newlines
// into <br> so multi-line fields keep their layout.
function text(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

// Builds the token → string map used to fill a template for one ticket.
export function buildTemplateValues(ctx: TemplateContext): Record<string, string> {
  const { ticket: t, items, paid, company } = ctx;
  const price = items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
  const now = new Date();
  const moneyOpts = {
    currency: ctx.currency ?? DEFAULT_CURRENCY,
    locale: INTL_LOCALE[ctx.locale ?? DEFAULT_LOCALE],
  };
  const money = (v: number | null | undefined) => formatMoney(v, moneyOpts);

  return {
    "company.name": text(company?.name),
    "company.address": text(company?.address),
    "company.phone": text(company?.phone),
    "company.email": text(company?.email),
    "company.info": text(company?.info),
    "company.logo": company?.logoUrl
      ? `<img src="${company.logoUrl}" alt="" style="max-height:80px;max-width:240px" />`
      : "",

    "client.first_name": text(t.client?.first_name),
    "client.last_name": text(t.client?.last_name),
    "client.phone": text(t.client?.phone),
    "client.email": text(t.client?.email),
    "client.address": text(t.client?.address),

    "order.number": text(t.number),
    "order.status": text(t.status),
    "order.created_at": formatDate(t.created_at),
    "order.due_date": t.due_date ? formatDate(t.due_date) : "",
    "order.malfunction": text(t.malfunction),
    "order.complectation": text(t.complectation),
    "order.device_state": text(t.device_state),
    "order.conclusion": text(t.conclusion),
    "order.manager_notes": text(t.manager_notes),

    "device.group": text(t.group?.name),
    "device.brand": text(t.brand?.name),
    "device.model": text(t.model?.name),
    "device.modification": text(t.modification?.name),
    "device.sn_imei": text(t.sn_imei),

    "finance.est_price": money(t.est_price),
    "finance.price": money(price),
    "finance.prepayment": money(t.prepayment),
    "finance.paid": money(paid),
    "finance.due": money(price - paid),

    "staff.manager": text(t.manager?.full_name),
    "staff.technician": text(t.technician?.full_name),

    "date.today": formatDate(now.toISOString()),
    "date.now": formatDateTime(now.toISOString()),
  };
}

// Replaces every `{{token}}` (optional inner whitespace) in the template HTML
// with its value. Unknown tokens collapse to an empty string so no raw
// `{{...}}` leaks into the printed document.
export function renderTemplate(content: string, ctx: TemplateContext): string {
  const values = buildTemplateValues(ctx);
  return content.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, token) =>
    Object.prototype.hasOwnProperty.call(values, token) ? values[token] : "",
  );
}
