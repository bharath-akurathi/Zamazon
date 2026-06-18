const currency = (import.meta.env.VITE_CHECKOUT_CURRENCY || "USD").toUpperCase();
const locale = import.meta.env.VITE_CHECKOUT_LOCALE || undefined;

export const formatCurrency = (amount) =>
	new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
	}).format(Number(amount) || 0);
