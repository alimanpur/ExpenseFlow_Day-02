import { useQueryClient } from "@tanstack/react-query";

/**
 * Centralized cache invalidation used after every financial mutation so that
 * Dashboards, Circles, People, Balances, Settlements, Analytics, Profile,
 * Search, Reports and Notifications all update instantly without a refresh.
 */
export function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    const keys = [
      "dashboard",
      "circles",
      "circle",
      "expenses",
      "people",
      "settlements",
      "suggested-settlements",
      "analytics",
      "reports",
      "search",
      "notifications",
      "activity",
      "profile",
    ];
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };
}
