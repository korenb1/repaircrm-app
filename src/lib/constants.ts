import type { TicketStatus, ItemKind } from "./types";

// Ticket statuses with Ukrainian labels + MUI palette colors.
// Order = display order in dropdowns.
export const STATUSES: Record<
  TicketStatus,
  { label: string; color: string; bg: string }
> = {
  draft:            { label: "Чернетка",            color: "#1976d2", bg: "#e3f2fd" },
  new:              { label: "Нове",                color: "#0288d1", bg: "#e1f5fe" },
  in_progress:      { label: "В роботі",            color: "#2e7d32", bg: "#e8f5e9" },
  ready:            { label: "Готове",              color: "#2e7d32", bg: "#c8e6c9" },
  issued:           { label: "Видано",              color: "#616161", bg: "#eeeeee" },
  return_no_repair: { label: "Видати без ремонту",  color: "#ffffff", bg: "#ed6c02" },
};

export const STATUS_ORDER: TicketStatus[] = [
  "draft",
  "new",
  "in_progress",
  "ready",
  "issued",
  "return_no_repair",
];

export const ITEM_KINDS: Record<ItemKind, string> = {
  labor: "Робота",
  service: "Послуга",
  product: "Товар",
};

// UI string table — single source of Ukrainian labels.
export const T = {
  appName: "RepairCRM",
  nav: { workflows: "Заявки", contacts: "Контакти" },
  login: {
    title: "Вхід",
    email: "Email",
    password: "Пароль",
    submit: "Увійти",
    error: "Невірний email або пароль",
  },
  workflows: {
    title: "Заявки",
    newTicket: "Заявка",
    search: "Пошук…",
    cards: { mine: "Мої заявки", overdue: "Прострочені", receivable: "До оплати" },
    cols: {
      number: "№",
      status: "Статус",
      group: "Група",
      device: "Пристрій",
      malfunction: "Несправність",
      client: "Клієнт",
      created: "Створено",
      technician: "Технік",
      estPrice: "Орієнт. ціна",
      price: "Ціна",
      paid: "Оплачено",
      due: "Термін",
    },
  },
  contacts: {
    title: "Контакти",
    people: "Люди",
    organizations: "Організації",
    newContact: "+ Контакт",
    cols: {
      name: "Ім'я",
      email: "Email",
      phone: "Телефон",
      address: "Адреса",
      note: "Нотатка",
      balance: "Баланс, ₴",
    },
  },
  ticket: {
    tabs: { general: "Загальна інформація", items: "Послуги та товари", invoices: "Рахунки та оплати" },
  },
  contactCard: {
    tabs: { general: "Загальна", balance: "Баланс", tickets: "Заявки" },
  },
  common: {
    save: "Зберегти",
    create: "Створити",
    createAndOpen: "Створити й відкрити",
    cancel: "Скасувати",
    add: "Додати",
    notAssigned: "Не призначено",
  },
} as const;
