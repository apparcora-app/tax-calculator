import { db } from "./db";
import { 
  taxCalculations,
  type InsertTaxCalculation,
  type TaxCalculation 
} from "@shared/schema";
import { desc } from "drizzle-orm";

export interface IStorage {
  saveCalculation(calc: InsertTaxCalculation & {
    totalIncome: number;
    adjustedGrossIncome: number;
    standardOrItemizedDeduction: number;
    taxableIncome: number;
    estimatedTax: number;
    totalCredits: number;
    refundOrOwe: number;
  }): Promise<TaxCalculation>;
  getRecentCalculations(): Promise<TaxCalculation[]>;
}

export class DatabaseStorage implements IStorage {
  async saveCalculation(calc: any): Promise<TaxCalculation> {
    const [result] = await db.insert(taxCalculations).values(calc).returning();
    return result;
  }

  async getRecentCalculations(): Promise<TaxCalculation[]> {
    return await db.select().from(taxCalculations).orderBy(desc(taxCalculations.createdAt)).limit(10);
  }
}

export const storage = new DatabaseStorage();
