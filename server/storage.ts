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
    selfEmploymentTax: number;
    stateIncomeTax: number;
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

export class MemStorage implements IStorage {
  private calculations: TaxCalculation[] = [];
  private currentId = 1;

  async saveCalculation(calc: any): Promise<TaxCalculation> {
    const result: TaxCalculation = {
      ...calc,
      id: this.currentId++,
      createdAt: new Date(),
    };
    this.calculations.push(result);
    return result;
  }

  async getRecentCalculations(): Promise<TaxCalculation[]> {
    return [...this.calculations].sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)).slice(0, 10);
  }
}

export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
