// Variable catalog for document templates. Each token is inserted verbatim
// into the editor as `{{token}}`; `renderTemplate` substitutes real ticket
// data for those tokens when a document is printed from a ticket card.
// Tokens are grounded in the DB schema (contacts / tickets / devices / profiles).

import { formatUAH, formatDate, formatDateTime } from "@/lib/money";
import type { TicketItem, TicketRow } from "@/lib/types";

export interface TemplateVariable {
  token: string;
  label: string;
}

export interface VariableGroup {
  key: string;
  label: string;
  variables: TemplateVariable[];
}

export const VARIABLE_GROUPS: VariableGroup[] = [
  {
    key: "company",
    label: "Компанія",
    variables: [
      { token: "company.name", label: "Назва компанії" },
      { token: "company.address", label: "Адреса" },
      { token: "company.phone", label: "Телефон" },
      { token: "company.email", label: "Email" },
      { token: "company.logo", label: "Логотип" },
      { token: "company.info", label: "Додаткова інформація" },
    ],
  },
  {
    key: "client",
    label: "Клієнт",
    variables: [
      { token: "client.first_name", label: "Ім'я" },
      { token: "client.last_name", label: "Прізвище" },
      { token: "client.phone", label: "Телефон" },
      { token: "client.email", label: "Email" },
      { token: "client.address", label: "Адреса" },
    ],
  },
  {
    key: "order",
    label: "Замовлення",
    variables: [
      { token: "order.number", label: "Номер заявки" },
      { token: "order.status", label: "Статус" },
      { token: "order.created_at", label: "Дата створення" },
      { token: "order.due_date", label: "Термін" },
      { token: "order.malfunction", label: "Несправність" },
      { token: "order.complectation", label: "Комплектація" },
      { token: "order.device_state", label: "Стан пристрою" },
      { token: "order.conclusion", label: "Висновок" },
      { token: "order.manager_notes", label: "Примітки менеджера" },
    ],
  },
  {
    key: "device",
    label: "Пристрій",
    variables: [
      { token: "device.group", label: "Група" },
      { token: "device.brand", label: "Бренд" },
      { token: "device.model", label: "Модель" },
      { token: "device.modification", label: "Модифікація" },
      { token: "device.sn_imei", label: "Серійний номер / IMEI" },
    ],
  },
  {
    key: "finance",
    label: "Фінанси",
    variables: [
      { token: "finance.est_price", label: "Орієнтовна ціна" },
      { token: "finance.price", label: "Сума до сплати" },
      { token: "finance.prepayment", label: "Передоплата" },
      { token: "finance.paid", label: "Оплачено" },
      { token: "finance.due", label: "Залишок" },
    ],
  },
  {
    key: "staff",
    label: "Співробітники",
    variables: [
      { token: "staff.manager", label: "Менеджер" },
      { token: "staff.technician", label: "Технік" },
    ],
  },
  {
    key: "date",
    label: "Дата",
    variables: [
      { token: "date.today", label: "Сьогодні" },
      { token: "date.now", label: "Дата і час" },
    ],
  },
];

// ── Substitution ───────────────────────────────────────────────────────────

export interface TemplateContext {
  ticket: TicketRow;
  items: TicketItem[];
  // Sum of recorded payments (payment + prepayment) for the ticket.
  paid: number;
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

    "finance.est_price": formatUAH(t.est_price),
    "finance.price": formatUAH(price),
    "finance.prepayment": formatUAH(t.prepayment),
    "finance.paid": formatUAH(paid),
    "finance.due": formatUAH(price - paid),

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
