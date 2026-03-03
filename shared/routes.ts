import { z } from 'zod';
import { insertTaxCalculationSchema, taxCalculations } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  tax: {
    calculate: {
      method: 'POST' as const,
      path: '/api/calculate' as const,
      input: insertTaxCalculationSchema,
      responses: {
        200: z.custom<typeof taxCalculations.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    getRecent: {
      method: 'GET' as const,
      path: '/api/calculations' as const,
      responses: {
        200: z.array(z.custom<typeof taxCalculations.$inferSelect>()),
      }
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type CalculateTaxInput = z.infer<typeof api.tax.calculate.input>;
export type CalculateTaxResponse = z.infer<typeof api.tax.calculate.responses[200]>;
export type CalculationsListResponse = z.infer<typeof api.tax.getRecent.responses[200]>;
