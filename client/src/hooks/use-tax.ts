import { useMutation } from "@tanstack/react-query";
import { api, type CalculateTaxInput, type CalculateTaxResponse } from "@shared/routes";
import { calculateTax } from "@shared/calculator";
import type { TaxCalculationRecord } from "@shared/schema";
import { z } from "zod";

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
      // 1. Strict input validation
      const validatedInput = api.tax.calculate.input.parse(data);

      // 2. Pure client-side deterministic tax engine (100% privacy, zero network transmission)
      const calcResult = calculateTax(validatedInput);
      const validatedOutput = parseWithLogging(api.tax.calculate.responses[200], calcResult, "CalculateTaxResponse");

      // 3. Atomically persist calculation snapshot to local client history
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const STORAGE_KEY = "tax_calculator_history";
          const existingRaw = window.localStorage.getItem(STORAGE_KEY);
          const history: TaxCalculationRecord[] = existingRaw ? JSON.parse(existingRaw) : [];

          const snapshot: TaxCalculationRecord = {
            ...validatedInput,
            id: `calc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            createdAt: new Date().toISOString(),
            results: validatedOutput,
          };

          const updated = [snapshot, ...history.filter((item) => item.id !== snapshot.id)].slice(0, 50);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      } catch (storageErr) {
        console.warn("Could not save to client localStorage history:", storageErr);
      }

      return validatedOutput;
    },
  });
}
