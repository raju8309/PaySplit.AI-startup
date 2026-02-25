import { useQuery } from "@tanstack/react-query";
import { getAnalyticsSummary, getMonthlySpend, getPaymentsByStatus, getRecentActivity } from "@/lib/api";

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => getAnalyticsSummary(),
  });
}

export function useMonthlySpend(months = 6) {
  return useQuery({
    queryKey: ["analytics", "monthly-spend", months],
    queryFn: () => getMonthlySpend(months),
  });
}

export function usePaymentsByStatus() {
  return useQuery({
    queryKey: ["analytics", "payments-by-status"],
    queryFn: () => getPaymentsByStatus(),
  });
}

export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ["analytics", "recent-activity", limit],
    queryFn: () => getRecentActivity(limit),
  });
}