/**
 * ExpenseFlow - Currency Service
 * Centralized, global currency formatting and conversion.
 * Every page must consume this service. Never manually concatenate currency symbols.
 */

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  SAR: '﷼',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  SGD: 'S$',
};

const CURRENCY_LOCALES = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-EU',
  GBP: 'en-GB',
  AED: 'en-AE',
  SAR: 'en-SA',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
  SGD: 'en-SG',
};

const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_SYMBOLS);

let _currentCurrency = 'USD';
let _currentLocale = 'en-US';
let _listeners = [];

/**
 * Set the active currency. Triggers all registered listeners.
 * @param {string} currency - ISO currency code
 */
export function setActiveCurrency(currency) {
  if (currency === _currentCurrency) return;
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    console.warn(`[CurrencyService] Unsupported currency: ${currency}, falling back to USD`);
    currency = 'USD';
  }
  _currentCurrency = currency;
  _currentLocale = CURRENCY_LOCALES[currency] || 'en-US';
  _listeners.forEach(fn => fn(currency));
}

/**
 * Get the current active currency.
 * @returns {string}
 */
export function getActiveCurrency() {
  return _currentCurrency;
}

/**
 * Subscribe to currency changes.
 * @param {Function} listener - callback(newCurrency)
 * @returns {Function} unsubscribe
 */
export function onCurrencyChange(listener) {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter(fn => fn !== listener);
  };
}

/**
 * Get currency symbol.
 * @param {string} [currency]
 * @returns {string}
 */
export function getSymbol(currency = _currentCurrency) {
  return CURRENCY_SYMBOLS[currency] || '$';
}

/**
 * Get locale for a currency.
 * @param {string} [currency]
 * @returns {string}
 */
export function getLocale(currency = _currentCurrency) {
  return CURRENCY_LOCALES[currency] || 'en-US';
}

/**
 * Format a number as large number (K, L, Cr, M, B etc.)
 */
function formatLargeNumber(number, currency) {
  if (number === null || number === undefined || isNaN(number)) return '0';
  const absNum = Math.abs(number);

  if (currency === 'INR') {
    if (absNum >= 10000000) return (absNum / 10000000).toFixed(1).replace(/\.0$/, '') + 'Cr';
    if (absNum >= 100000) return (absNum / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    if (absNum >= 1000) return (absNum / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    if (absNum >= 1000000000) return (absNum / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (absNum >= 1000000) return (absNum / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (absNum >= 1000) return (absNum / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return absNum.toFixed(2);
}

/**
 * Global formatCurrency — THE ONLY currency formatter the app should use.
 * @param {number|string} amount
 * @param {string} [currency] - defaults to active currency
 * @param {Object} [options]
 * @param {boolean} [options.showSymbol=true]
 * @param {boolean} [options.useLargeNumberFormat=true]
 * @param {boolean} [options.signed=false] - prepend +/- for positive/negative
 * @param {boolean} [options.compact=false] - use short format
 * @returns {string}
 */
export function formatCurrency(amount, currency, options = {}) {
  const amt = (amount === null || amount === undefined || isNaN(amount)) ? 0 : Number(amount);
  const cur = currency || _currentCurrency;
  const { showSymbol = true, useLargeNumberFormat = true, signed = false, compact = false } = options;

  const symbol = CURRENCY_SYMBOLS[cur] || '$';

  let formatted;
  if (compact || useLargeNumberFormat) {
    formatted = formatLargeNumber(amt, cur);
  } else {
    try {
      formatted = new Intl.NumberFormat(CURRENCY_LOCALES[cur] || 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Math.abs(amt));
    } catch {
      formatted = Math.abs(amt).toFixed(2);
    }
  }

  const prefix = signed ? (amt >= 0 ? '+' : '−') : '';
  const symbolStr = showSymbol ? symbol : '';

  return `${prefix}${symbolStr}${formatted}`;
}

/**
 * Format with full Intl currency formatting.
 * @param {number} amount
 * @param {string} [currency]
 * @returns {string}
 */
export function formatCurrencyFull(amount, currency = _currentCurrency) {
  const amt = (amount === null || amount === undefined || isNaN(amount)) ? 0 : Number(amount);
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALES[currency] || 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amt);
  } catch {
    return `${CURRENCY_SYMBOLS[currency] || '$'}${amt.toFixed(2)}`;
  }
}

/**
 * Parse a currency string to number.
 * @param {string|number} value
 * @returns {number}
 */
export function parseCurrency(value) {
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Compact currency formatting (e.g. 1.2K, 3.4L, 2.5Cr).
 * Delegates to the large-number formatter used by formatCurrency.
 */
export function formatCurrencyCompact(amount, currency = _currentCurrency, options = {}) {
  const amt = (amount === null || amount === undefined || isNaN(amount)) ? 0 : Number(amount);
  const cur = currency || _currentCurrency;
  const symbol = CURRENCY_SYMBOLS[cur] || '$';
  const formatted = formatLargeNumber(amt, cur);
  const prefix = options.signed ? (amt >= 0 ? '+' : '−') : '';
  return `${prefix}${symbol}${formatted}`;
}

/**
 * Get the currency symbol for a given (or active) currency.
 */
export function getCurrencySymbol(currency = _currentCurrency) {
  return CURRENCY_SYMBOLS[currency || _currentCurrency] || '$';
}

/**
 * Format a date value for display.
 * Accepts a Date, an ISO string, a timestamp (number), or null/undefined.
 * Falls back to a long-form readable string; returns an empty string for
 * invalid/missing input so callers never render "Invalid Date".
 * @param {Date|string|number|null|undefined} value
 * @param {object} [options] Intl.DateTimeFormat options (defaults to date-only)
 * @returns {string}
 */
export function formatDate(value, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export { SUPPORTED_CURRENCIES };
