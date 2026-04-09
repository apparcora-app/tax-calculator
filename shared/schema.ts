import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const filingStatusValues = [
  "Single",
  "Married Filing Jointly",
  "Married Filing Separately",
  "Head of Household",
  "Qualifying Surviving Spouse",
] as const;

export const stateValues = [
  "Other",
  "Arizona",
  "California",
  "Colorado",
  "Florida",
  "Illinois",
  "Michigan",
  "New York",
  "North Carolina",
  "Pennsylvania",
  "Texas",
] as const;

const nonNegativeInt = (schema: z.ZodNumber) => schema.int().min(0);

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
  stateTaxesWithheld: integer("state_taxes_withheld").notNull().default(0),
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
  refundableCredits: integer("refundable_credits").notNull().default(0),
  totalPayments: integer("total_payments").notNull().default(0),
  refundOrOwe: integer("refund_or_owe").notNull().default(0),

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaxCalculationSchema = createInsertSchema(taxCalculations, {
  taxYear: (schema) => schema.int().min(2025).max(2025),
  filingStatus: z.enum(filingStatusValues),
  state: z.enum(stateValues),
  age: (schema) => schema.int().min(1).max(120),
  dependentsUnder17: nonNegativeInt,
  dependentsInSchool: nonNegativeInt,
  otherDependents: nonNegativeInt,
  wages: nonNegativeInt,
  spouseWages: nonNegativeInt,
  businessIncome: nonNegativeInt,
  businessExpenses: nonNegativeInt,
  taxesWithheld: nonNegativeInt,
  stateTaxesWithheld: nonNegativeInt,
  interestIncome: nonNegativeInt,
  dividendIncome: nonNegativeInt,
  qualifiedDividends: nonNegativeInt,
  capitalGains: nonNegativeInt,
  longTermCapitalGains: nonNegativeInt,
  otherIncome: nonNegativeInt,
  iraContributions: nonNegativeInt,
  studentLoanInterest: nonNegativeInt,
  medicalExpenses: nonNegativeInt,
  stateLocalTaxes: nonNegativeInt,
  mortgageInterest: nonNegativeInt,
  charitableContributions: nonNegativeInt,
  childcareExpenses: nonNegativeInt,
  energyImprovements: nonNegativeInt,
  educationExpenses: nonNegativeInt,
}).omit({ 
  id: true, 
  createdAt: true,
  totalIncome: true,
  adjustedGrossIncome: true,
  standardOrItemizedDeduction: true,
  taxableIncome: true,
  estimatedTax: true,
  selfEmploymentTax: true,
  stateIncomeTax: true,
  totalCredits: true,
  refundableCredits: true,
  totalPayments: true,
  refundOrOwe: true
}).superRefine((value, ctx) => {
  if (value.qualifiedDividends > value.dividendIncome) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Qualified dividends cannot exceed total dividends",
      path: ["qualifiedDividends"],
    });
  }
});

export const taxCalculationSelectSchema = createSelectSchema(taxCalculations);

export const calculationResultSchema = z.object({
  totalIncome: z.number().int().min(0),
  adjustedGrossIncome: z.number().int().min(0),
  standardOrItemizedDeduction: z.number().int().min(0),
  taxableIncome: z.number().int().min(0),
  estimatedTax: z.number().int().min(0),
  selfEmploymentTax: z.number().int().min(0),
  stateIncomeTax: z.number().int().min(0),
  totalCredits: z.number().int().min(0),
  refundableCredits: z.number().int().min(0),
  totalPayments: z.number().int().min(0),
  refundOrOwe: z.number().int(),
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
  refundableCredits: number;
  totalPayments: number;
  refundOrOwe: number; // positive = refund, negative = owe
};

export type CalculateTaxResponse = z.infer<typeof calculationResultSchema>;
