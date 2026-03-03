import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CalculateTaxInput, type CalculateTaxResponse, type CalculationsListResponse } from "@shared/routes";
import { z } from "zod";

// Create a robust logging parser to catch silent validation failures
function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod Error] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useCalculateTax() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CalculateTaxInput): Promise<CalculateTaxResponse> => {
      // Ensure we're sending what the backend expects by parsing through input schema first
      const validatedInput = api.tax.calculate.input.parse(data);
      
      const res = await fetch(api.tax.calculate.path, {
        method: api.tax.calculate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedInput),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errorData = await res.json();
          const error = api.tax.calculate.responses[400].parse(errorData);
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to calculate taxes");
      }

      const rawResponse = await res.json();
      return parseWithLogging(api.tax.calculate.responses[200], rawResponse, "CalculateTaxResponse");
    },
    onSuccess: () => {
      // Invalidate the recent calculations list so it updates
      queryClient.invalidateQueries({ queryKey: [api.tax.getRecent.path] });
    },
  });
}

export function useRecentCalculations() {
  return useQuery({
    queryKey: [api.tax.getRecent.path],
    queryFn: async (): Promise<CalculationsListResponse> => {
      const res = await fetch(api.tax.getRecent.path, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch recent calculations");
      }

      const rawResponse = await res.json();
      return parseWithLogging(api.tax.getRecent.responses[200], rawResponse, "RecentCalculationsList");
    },
  });
}
