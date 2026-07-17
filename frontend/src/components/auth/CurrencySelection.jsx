import { useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { setActiveCurrency, SUPPORTED_CURRENCIES } from "../../services/currency.service";

/**
 * CurrencySelection — ensures the global CurrencyService stays in sync
 * with the user's preferences. Mounted once at the App level.
 */
export default function CurrencySelection() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.preferences?.currency) {
      setActiveCurrency(user.preferences.currency);
    }
  }, [user?.preferences?.currency]);

  // This component does not render anything visible
  return null;
}