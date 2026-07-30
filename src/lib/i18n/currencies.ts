// Selectable display currencies. Amounts are stored as plain numbers — the
// currency only changes how they are formatted (symbol + fraction digits),
// there is no FX conversion. `fractionDigits` follows common convention:
// UAH is whole-hryvnia, the rest show cents.

export interface CurrencyDef {
  code: string;
  symbol: string;
  label: string;
  fractionDigits: number;
}

export const CURRENCIES: CurrencyDef[] = [
  { code: "USD", symbol: "$", label: "US Dollar", fractionDigits: 2 },
  { code: "EUR", symbol: "€", label: "Euro", fractionDigits: 2 },
  { code: "UAH", symbol: "₴", label: "Ukrainian Hryvnia", fractionDigits: 0 },
  { code: "GBP", symbol: "£", label: "British Pound", fractionDigits: 2 },
  { code: "PLN", symbol: "zł", label: "Polish Złoty", fractionDigits: 2 },
];

export const DEFAULT_CURRENCY = "USD";

export const CURRENCY_BY_CODE: Record<string, CurrencyDef> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c]),
);

export function currencyDef(code: string | null | undefined): CurrencyDef {
  return CURRENCY_BY_CODE[code ?? ""] ?? CURRENCY_BY_CODE[DEFAULT_CURRENCY];
}
