/**
 * ExpenseFlow - Currency Formatter (DEPRECATED)
 * 
 * This file is deprecated. All currency formatting should use the centralized
 * CurrencyService at `../services/currency.service.js`.
 * 
 * Keep this file temporarily to avoid breaking imports, but all values
 * now delegate to the CurrencyService.
 */
export { 
  formatCurrency, 
  formatCurrencyFull, 
  formatCurrencyCompact, 
  getCurrencySymbol, 
  parseCurrency 
} from "../services/currency.service";