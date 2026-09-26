/** Stop-before-pay. Never click payment controls or open a payment URL. */

const DENY_LABEL = [
  /pay now/i,
  /complete order/i,
  /buy it now/i,
  /buy with shop pay/i,
  /shop pay/i,
  /complete purchase/i,
];

const DENY_URL = [/\/checkouts\/[^/]+\/payment/i, /complete_purchase/i, /\/payment(?:\/|$)/i];

const CARD_FIELD = /cc-number|cc-exp|cc-csc|cardnumber|credit-card|card-number/i;

export function isDeniedLabel(label: string): boolean {
  const text = label.replace(/\s+/g, " ").trim();
  return DENY_LABEL.some((pattern) => pattern.test(text));
}

export function isDeniedUrl(url: string): boolean {
  return DENY_URL.some((pattern) => pattern.test(url));
}

export function isCardField(selectorOrName: string): boolean {
  return CARD_FIELD.test(selectorOrName);
}

export function isDeniedTarget(label: string, href?: string | null): boolean {
  if (isDeniedLabel(label)) return true;
  if (href && isDeniedUrl(href)) return true;
  return false;
}
