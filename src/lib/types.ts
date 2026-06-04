// DB row types (manual — mirrors supabase/migrations/20260602000000_init.sql)

export type Role = "admin" | "manager" | "technician";

export type TicketStatus =
  | "draft"
  | "new"
  | "in_progress"
  | "ready"
  | "issued"
  | "return_no_repair";

export type ItemKind = "labor" | "service" | "product";

export type PaymentKind =
  | "payment"
  | "prepayment"
  | "advance"
  | "payout"
  | "correction";

export interface Profile {
  id: string;
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

export interface Ticket {
  id: number;
  number: string;
  status: TicketStatus;
  manager_id: string | null;
  technician_id: string | null;
  client_id: number | null;
  group_id: number | null;
  brand_id: number | null;
  model_id: number | null;
  modification_id: number | null;
  sn_imei: string | null;
  color: string | null;
  device_state: string | null;
  malfunction: string | null;
  complectation: string | null;
  est_price: number;
  prepayment: number;
  due_date: string | null;
  urgent: boolean;
  manager_notes: string | null;
  technician_notes: string | null;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceCatalogItem {
  id: number;
  kind: ItemKind;
  name: string;
  sku: string | null;
  price: number;
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

// Joined row used by the workflows table (ticket + names + totals)
export interface TicketRow extends Ticket {
  group?: { name: string } | null;
  model?: { name: string } | null;
  client?: Pick<Contact, "id" | "first_name" | "last_name" | "phone"> | null;
  manager?: { full_name: string } | null;
  technician?: { full_name: string } | null;
  price?: number;
  paid?: number;
}
