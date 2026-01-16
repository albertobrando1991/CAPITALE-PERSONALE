import { useQuery } from "@tanstack/react-query";

interface AdminStats {
  users: {
    total: number;
    active: number;
    newLastMonth: number;
    growth: number;
  };
  revenue: {
    total: number;
    monthly: number;
    growth: number;
  };
  content: {
    concorsi: number;
    materials: number;
    flashcards: number;
    simulations: number;
  };
  activity: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
  };
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["/api/admin/stats/overview"],
    // Add Authorization header handling if not done globally by fetch/axios
    // Assuming a global fetcher or interceptor handles it, or I'll implement a fetcher here.
    // In AuthContext.tsx I saw direct fetch.
    // QueryClient usually needs a queryFn.
  });
}
