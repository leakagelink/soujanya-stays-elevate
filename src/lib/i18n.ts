/**
 * Language and currency foundation. English + INR today; add a new dictionary
 * (e.g. `hi`) with the same keys and set the locale to switch.
 */
const en = {
  "book.request": "Request booking",
  "book.waitlist": "Join waitlist",
  "folio.outstanding": "Outstanding",
  "folio.paid": "Paid",
  "folio.deposit": "Security deposit",
  "consent.title": "I accept the policies",
} as const;

export type MessageKey = keyof typeof en;
const dictionaries: Record<string, Partial<Record<MessageKey, string>>> = { en };

let locale = "en";
export const setLocale = (l: string) => { if (dictionaries[l]) locale = l; };
export const t = (k: MessageKey) => dictionaries[locale]?.[k] ?? en[k];

export type CurrencyConfig = { code: string; locale: string };
let currency: CurrencyConfig = { code: "INR", locale: "en-IN" };
export const setCurrency = (c: CurrencyConfig) => { currency = c; };

/** Amounts are stored as whole rupees; format in the configured currency. */
export const money = (n: number) => new Intl.NumberFormat(currency.locale, { style: "currency", currency: currency.code, maximumFractionDigits: 0 }).format(n);
