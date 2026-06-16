// DB row types (manual — mirrors supabase/migrations/20260602000000_init.sql)

export type Role = "admin" | "manager" | "technician";

// Ticket status keys are now data-driven (ticket_statuses table), so this is
// an open string rather than a fixed union.
export type TicketStatus = string;

export type ItemKind = "labor" | "service" | "product";

export type PaymentKind =
  | "payment"
  | "prepayment"
  | "advance"
  | "payout"
  | "correction"
  | "refund";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  phone: string;
  telegram_username: string; // stored without leading '@'
  avatar_path: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Group {
  id: number;
  name: string;
}
export interface Brand {
  id: number;
  group_id: number;
  name: string;
}
export interface Model {
  id: number;
  brand_id: number;
  name: string;
}
export interface Modification {
  id: number;
  model_id: number;
  name: string;
}

export interface Contact {
  id: number;
  type: "person" | "organization";
  is_supplier: boolean;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  discount_card: string | null;
  discount_service: number;
  discount_goods: number;
  note: string | null;
  tags: string[];
  created_at: string;
}

export interface ContactPhone {
  id: number;
  contact_id: number;
  phone: string;
  label: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface ContactDocument {
  id: number;
  contact_id: number;
  path: string;
  name: string | null;
  size: number | null;
  mime: string | null;
  uploaded_by: string | null;
  created_at: string;
}

// A device is a SN/IMEI-keyed registry row: one SN == one device, globally.
export interface Device {
  id: number;
  sn_imei: string;
  group_id: number | null;
  brand_id: number | null;
  model_id: number | null;
  modification_id: number | null;
  client_id: number | null;
  created_at: string;
}

// Device joined with catalog names + owner, used for the SN/IMEI search/autofill.
export interface DeviceRow extends Device {
  group?: { name: string } | null;
  brand?: { name: string } | null;
  model?: { name: string } | null;
  modification?: { name: string } | null;
  client?: Contact | null;
}

export interface Ticket {
  id: number;
  number: string;
  status: TicketStatus;
  device_id: number | null;
  manager_id: string | null;
  technician_id: string | null;
  client_id: number | null;
  group_id: number | null;
  brand_id: number | null;
  model_id: number | null;
  modification_id: number | null;
  sn_imei: string | null;
  device_state: string | null;
  malfunction: string | null;
  complectation: string | null;
  est_price: number;
  prepayment: number;
  due_date: string | null;
  urgent: boolean;
  manager_notes: string | null;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
}

// Flat directory reference lists managed in Settings → Довідник.
export interface Malfunction {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
}
export interface EquipmentItem {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface ServiceCategory {
  id: number;
  kind: "service" | "product";
  parent_id: number | null;
  name: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface ServiceCatalogItem {
  id: number;
  kind: ItemKind;
  name: string;
  sku: string | null;
  price: number;
  category_id: number | null;
  cost_price: number;
  barcode: string | null;
}

export interface TicketItem {
  id: number;
  ticket_id: number;
  technician_id: string | null;
  kind: ItemKind;
  name: string;
  price: number;
  qty: number;
}

export interface Invoice {
  id: number;
  ticket_id: number;
  status: "pending" | "paid" | "cancelled";
  payment_method: string | null;
  amount: number;
  created_at: string;
}

export interface Payment {
  id: number;
  contact_id: number;
  ticket_id: number | null;
  kind: PaymentKind;
  amount: number;
  comment: string | null;
  created_at: string;
}

// View rows
export interface TicketTotals {
  ticket_id: number;
  price: number;
  paid: number;
}
export interface ContactBalance {
  contact_id: number;
  balance: number;
}

export type FinanceKind = "expense" | "revenue";

export interface FinanceCategory {
  id: number;
  kind: FinanceKind;
  name: string;
  is_default_closed: boolean;
  sort_order: number;
  created_at: string;
}

export type FinanceAccountType = "cash" | "cashless" | "card";

export interface FinancialAccount {
  id: number;
  name: string;
  type: FinanceAccountType;
  card_last4: string | null;
  sort_order: number;
  created_at: string;
}

export type TransactionKind =
  | "revenue"
  | "expense"
  | "transfer_in"
  | "transfer_out";

export interface FinanceTransaction {
  id: number;
  account_id: number;
  kind: TransactionKind;
  amount: number;
  category_id: number | null;
  contact_id: number | null;
  ticket_id: number | null;
  source_kind: PaymentKind | null;
  comment: string | null;
  transfer_id: string | null;
  created_by: string | null;
  created_at: string;
}

// Ticket fields embedded into a ledger row so a ticket-linked payment can be
// labelled with its number + device (group/brand/model).
export interface FinanceTicketRef {
  id: number;
  number: string;
  group?: { name: string } | null;
  brand?: { name: string } | null;
  model?: { name: string } | null;
}

// Joined row used by the ledger table (tx + category/contact/creator/ticket).
export interface FinanceTransactionRow extends FinanceTransaction {
  category?: { name: string } | null;
  contact?: Pick<Contact, "id" | "first_name" | "last_name"> | null;
  creator?: { full_name: string } | null;
  ticket?: FinanceTicketRef | null;
}

export interface TicketStatusRow {
  key: string;
  label: string;
  color: string;
  bg: string;
  sort_order: number;
  is_terminal: boolean;
  is_default: boolean;
  group: string;
}

export interface StatusTransition {
  from_key: string;
  to_key: string;
}

export type DocumentTemplateKind =
  | "acceptance_receipt"
  | "completion_act"
  | "invoice"
  | "other";

export interface DocumentTemplate {
  id: number;
  name: string;
  kind: DocumentTemplateKind;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_path: string | null;
  additional_info: string;
  updated_at: string;
}

export type TicketEventKind =
  | "created"
  | "status_changed"
  | "item_added"
  | "item_removed"
  | "invoice_added"
  | "payment_added"
  | "comment"
  | "attachment";

export interface TicketEvent {
  id: number;
  ticket_id: number;
  actor_id: string | null;
  kind: TicketEventKind;
  summary: string;
  meta: Record<string, unknown>;
  created_at: string;
}

// Joined row used by the timeline (event + actor name)
export interface TicketEventRow extends TicketEvent {
  actor?: { full_name: string } | null;
}

// Joined row used by the workflows table (ticket + names + totals)
export interface TicketRow extends Ticket {
  group?: { name: string } | null;
  brand?: { name: string } | null;
  model?: { name: string } | null;
  modification?: { name: string } | null;
  client?: Pick<
    Contact,
    "id" | "first_name" | "last_name" | "phone" | "email" | "address"
  > | null;
  manager?: ProfileRef | null;
  technician?: ProfileRef | null;
  items?: { technician: ProfileRef | null }[];
  price?: number;
  paid?: number;
}

// Minimal profile fields embedded in joined rows (avatars + tooltips).
export interface ProfileRef {
  id: string;
  full_name: string;
  avatar_path: string | null;
}

// Saved ticket-filter presets (mirrors ticket_filters table).
export interface FilterCriteria {
  status?: string[];
  group?: number[];
  brand?: number[];
  model?: number[];
  client?: number[];
  manager?: string[];
  technician?: string[];
  created?: string; // date preset key, see src/lib/datePresets
}

export interface TicketFilter {
  id: number;
  owner_id: string;
  name: string;
  icon: string | null;
  is_shared: boolean;
  criteria: FilterCriteria;
  created_at: string;
}
