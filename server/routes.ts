import type { Express } from "express";
import type { Server } from "http";
import { api } from "@shared/routes";
import { calculateTax } from "@shared/calculator";
import { z } from "zod";


export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.post(api.tax.calculate.path, async (req, res) => {
    try {
      const input = api.tax.calculate.input.parse(req.body);
      const calcResult = calculateTax(input);

      res.status(200).json(calcResult);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  return httpServer;
}
