/**
 * Language and currency foundation. English + INR today; add a new dictionary
 * (e.g. `hi`) with the same keys and set the locale to switch.
 */
const en = {
  "guest.home": "For you",
  "guest.rooms": "Book a stay",
  "guest.food": "Dining",
  "guest.experiences": "Experiences",
  "guest.help": "Concierge",
  "guest.bookings": "My bookings",
  "guest.account": "Account",
  "guest.welcome": "Welcome back",
  "guest.escape": "Your next escape awaits.",
  "guest.discover": "Find your kind of stay",
  "guest.viewAll": "View all",
  "guest.signin": "Sign in to your guest account",
  "guest.signout": "Sign out",
  "guest.loading": "Getting your stay ready…",
  "guest.current": "Your stay",
  "guest.noStay": "A little getaway starts here",
  "guest.noStayDetail": "Reserve a room to enjoy dining, experiences and concierge services during your stay.",
  "guest.diningTitle": "Something delicious, delivered.",
  "guest.diningDetail": "In-room favourites, freshly prepared by our kitchen.",
  "guest.spaTitle": "Make time for yourself.",
  "guest.helpTitle": "A little help, whenever you need it.",
  "guest.illustrative": "Photography is illustrative.",
  "guest.search": "Search rooms",
  "guest.menuSearch": "Search the menu",
  "guest.all": "All",
  "guest.veg": "Vegetarian only",
  "guest.noResults": "No matches. Try another search.",
  "guest.arrival": "Check-in",
  "guest.departure": "Check-out",
  "guest.guests": "Guests",
  "guest.fullName": "Full name",
  "guest.phone": "Phone number",
  "guest.reserve": "Reserve this room",
  "guest.estimate": "Estimated total",
  "guest.perNight": "per night, before GST",
  "guest.saved": "Booking request saved",
  "guest.pending": "Reception will confirm your reservation.",
  "guest.policy": "Pay at hotel · 30% advance · Free cancellation until 48h before check-in",
  "guest.finalRate": "Seasonal rates may apply. The saved reservation shows your final total.",
  "guest.continue": "Continue",
  "guest.change": "Change reservation",
  "guest.invoice": "View invoice",
  "guest.cancel": "Cancel request",
  "guest.emptyBookings": "Your first stay is waiting",
  "guest.emptyBookingsDetail": "Your upcoming and past reservations will appear here.",
  "guest.browse": "Explore rooms",
  "guest.order": "Place order · Add to room bill",
  "guest.cart": "Your basket",
  "guest.orders": "Order tracking",
  "guest.emptyCart": "Something tasty belongs here.",
  "guest.orderNotes": "Special requests (less spicy, no onion…)",
  "guest.orderSuccess": "Order placed! The kitchen has received it.",
  "guest.orderOpen": "Browse now. Room delivery opens after check-in.",
  "guest.unavailable": "Unavailable",
  "guest.add": "Add",
  "guest.total": "Total",
  "guest.serviceStay": "Choose a confirmed stay to reserve experiences or contact concierge.",
  "guest.accountDetail": "Your guest account",
  "guest.paymentTitle": "Payments & cancellation",
  "guest.billing": "Bills & reservations",
  "guest.retry": "Try again",
  "guest.failed": "Unable to load your reservations. Please try again.",
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
