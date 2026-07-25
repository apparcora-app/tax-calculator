import { useMutation } from "@tanstack/react-query";
import { api, type CalculateTaxInput, type CalculateTaxResponse } from "@shared/routes";
import { calculateTax } from "@shared/calculator";
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
  return useMutation({
    mutationFn: async (data: CalculateTaxInput): Promise<CalculateTaxResponse> => {
      // Ensure we're sending what the backend expects by parsing through input schema first
      const validatedInput = api.tax.calculate.input.parse(data);
      
      try {
        const res = await fetch(api.tax.calculate.path, {
          method: api.tax.calculate.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validatedInput),
          credentials: "include",
        });

        if (res.ok) {
          const rawResponse = await res.json();
          return parseWithLogging(api.tax.calculate.responses[200], rawResponse, "CalculateTaxResponse");
        }

        if (res.status === 400) {
          const errorData = await res.json();
          const error = api.tax.calculate.responses[400].parse(errorData);
          throw new Error(error.message || "Validation failed");
        }
      } catch (err: any) {
        // If validation failed explicitly, rethrow
        if (err.message && err.message.includes("Validation failed")) {
          throw err;
        }
        // Otherwise, fall back to pure client-side calculation (e.g. static hosting on Firebase)
        console.warn("Backend API unavailable, using client-side calculation engine:", err);
      }

      // Execute client-side tax calculation
      const calcResult = calculateTax(validatedInput);
      return parseWithLogging(api.tax.calculate.responses[200], calcResult, "CalculateTaxResponse");
    },
  });
}

