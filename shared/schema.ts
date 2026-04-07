import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const taxCalculations = pgTable("tax_calculations", {
  id: serial("id").primaryKey(),
  
  // Basic Info
  taxYear: integer("tax_year").notNull().default(2025),
  filingStatus: text("filing_status").notNull(),
  state: text("state").notNull().default("Other"),
  age: integer("age").notNull(),
  dependentsUnder17: integer("dependents_under_17").notNull().default(0),
  dependentsInSchool: integer("dependents_in_school").notNull().default(0),
  otherDependents: integer("other_dependents").notNull().default(0),

  // Income
  wages: integer("wages").notNull().default(0),
  spouseWages: integer("spouse_wages").notNull().default(0),
  businessIncome: integer("business_income").notNull().default(0),
  businessExpenses: integer("business_expenses").notNull().default(0),
  taxesWithheld: integer("taxes_withheld").notNull().default(0),
  interestIncome: integer("interest_income").notNull().default(0),
  dividendIncome: integer("dividend_income").notNull().default(0),
  qualifiedDividends: integer("qualified_dividends").notNull().default(0),
  capitalGains: integer("capital_gains").notNull().default(0),
  longTermCapitalGains: integer("long_term_capital_gains").notNull().default(0),
  otherIncome: integer("other_income").notNull().default(0),

  // Deductions
  iraContributions: integer("ira_contributions").notNull().default(0),
  studentLoanInterest: integer("student_loan_interest").notNull().default(0),
  medicalExpenses: integer("medical_expenses").notNull().default(0),
  stateLocalTaxes: integer("state_local_taxes").notNull().default(0),
  mortgageInterest: integer("mortgage_interest").notNull().default(0),
  charitableContributions: integer("charitable_contributions").notNull().default(0),

  // Credits
  childcareExpenses: integer("childcare_expenses").notNull().default(0),
  energyImprovements: integer("energy_improvements").notNull().default(0),
  educationExpenses: integer("education_expenses").notNull().default(0),

  // Results
  totalIncome: integer("total_income").notNull().default(0),
  adjustedGrossIncome: integer("adjusted_gross_income").notNull().default(0),
  standardOrItemizedDeduction: integer("standard_or_itemized_deduction").notNull().default(0),
  taxableIncome: integer("taxable_income").notNull().default(0),
  estimatedTax: integer("estimated_tax").notNull().default(0),
  selfEmploymentTax: integer("self_employment_tax").notNull().default(0),
  stateIncomeTax: integer("state_income_tax").notNull().default(0),
  totalCredits: integer("total_credits").notNull().default(0),
  refundOrOwe: integer("refund_or_owe").notNull().default(0),

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaxCalculationSchema = createInsertSchema(taxCalculations).omit({ 
  id: true, 
  createdAt: true,
  totalIncome: true,
  adjustedGrossIncome: true,
  standardOrItemizedDeduction: true,
  taxableIncome: true,
  estimatedTax: true,
  totalCredits: true,
  refundOrOwe: true
});

export type TaxCalculation = typeof taxCalculations.$inferSelect;
export type InsertTaxCalculation = z.infer<typeof insertTaxCalculationSchema>;

export type CalculateTaxRequest = InsertTaxCalculation;

export type CalculationResult = {
  totalIncome: number;
  adjustedGrossIncome: number;
  standardOrItemizedDeduction: number;
  taxableIncome: number;
  estimatedTax: number;
  selfEmploymentTax: number;
  stateIncomeTax: number;
  totalCredits: number;
  refundOrOwe: number; // positive = refund, negative = owe
};

export type CalculateTaxResponse = TaxCalculation;
