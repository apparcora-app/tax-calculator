import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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
  "Alaska",
  "Arizona",
  "California",
  "Colorado",
  "Florida",
  "Georgia",
  "Illinois",
  "Kentucky",
  "Massachusetts",
  "Michigan",
  "Nevada",
  "New Hampshire",
  "New York",
  "North Carolina",
  "Pennsylvania",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Washington",
  "Wyoming",
] as const;

const nonNegativeInt = (schema: z.ZodNumber) => schema.int().min(0);

export const taxCalculations = pgTable("tax_calculations", {
  id: serial("id").primaryKey(),
  
  // Basic Info
  taxYear: integer("tax_year").notNull().default(2025),
  filingStatus: text("filing_status").notNull(),
  state: text("state").notNull().default("Other"),
  age: integer("age").notNull(),
  spouseAge: integer("spouse_age").notNull().default(0),
  canBeClaimedAsDependent: boolean("can_be_claimed_as_dependent").notNull().default(false),
  isFirstFourYearsCollege: boolean("is_first_four_years_college").notNull().default(false),
  legacyAlimonyAgreement: boolean("legacy_alimony_agreement").notNull().default(false),
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
  workplaceRetirementContributions: integer("workplace_retirement_contributions").notNull().default(0),
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
  propertyTaxes: integer("property_taxes").notNull().default(0),
  mortgageInterest: integer("mortgage_interest").notNull().default(0),
  charitableContributions: integer("charitable_contributions").notNull().default(0),
  cashDonations: integer("cash_donations").notNull().default(0),
  nonCashDonations: integer("non_cash_donations").notNull().default(0),
  alimonyPayments: integer("alimony_payments").notNull().default(0),

  // Credits
  childcareExpenses: integer("childcare_expenses").notNull().default(0),
  energyImprovements: integer("energy_improvements").notNull().default(0),
  educationExpenses: integer("education_expenses").notNull().default(0),

  // Results
  totalIncome: integer("total_income").notNull().default(0),
  adjustedGrossIncome: integer("adjusted_gross_income").notNull().default(0),
  totalAdjustments: integer("total_adjustments").notNull().default(0),
  itemizedDeductions: integer("itemized_deductions").notNull().default(0),
  standardOrItemizedDeduction: integer("standard_or_itemized_deduction").notNull().default(0),
  taxableIncome: integer("taxable_income").notNull().default(0),
  federalTaxBeforeCredits: integer("federal_tax_before_credits").notNull().default(0),
  estimatedTax: integer("estimated_tax").notNull().default(0),
  selfEmploymentTax: integer("self_employment_tax").notNull().default(0),
  stateIncomeTax: integer("state_income_tax").notNull().default(0),
  alternativeMinimumTax: integer("alternative_minimum_tax").notNull().default(0),
  netInvestmentIncomeTax: integer("net_investment_income_tax").notNull().default(0),
  totalCredits: integer("total_credits").notNull().default(0),
  earnedIncomeTaxCredit: integer("earned_income_tax_credit").notNull().default(0),
  refundableCredits: integer("refundable_credits").notNull().default(0),
  totalPayments: integer("total_payments").notNull().default(0),
  refundOrOwe: integer("refund_or_owe").notNull().default(0),
  effectiveTaxRateBasisPoints: integer("effective_tax_rate_basis_points").notNull().default(0),

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaxCalculationSchema = createInsertSchema(taxCalculations, {
  taxYear: (schema) => schema.int().min(2025).max(2025),
  filingStatus: z.enum(filingStatusValues),
  state: z.enum(stateValues),
  age: (schema) => schema.int().min(1).max(120),
  spouseAge: (schema) => schema.int().min(0).max(120),
  canBeClaimedAsDependent: z.boolean(),
  isFirstFourYearsCollege: z.boolean(),
  legacyAlimonyAgreement: z.boolean(),
  dependentsUnder17: nonNegativeInt,
  dependentsInSchool: nonNegativeInt,
  otherDependents: nonNegativeInt,
  wages: nonNegativeInt,
  spouseWages: nonNegativeInt,
  businessIncome: nonNegativeInt,
  businessExpenses: nonNegativeInt,
  taxesWithheld: nonNegativeInt,
  stateTaxesWithheld: nonNegativeInt,
  workplaceRetirementContributions: nonNegativeInt,
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
  propertyTaxes: nonNegativeInt,
  mortgageInterest: nonNegativeInt,
  charitableContributions: nonNegativeInt,
  cashDonations: nonNegativeInt,
  nonCashDonations: nonNegativeInt,
  alimonyPayments: nonNegativeInt,
  childcareExpenses: nonNegativeInt,
  energyImprovements: nonNegativeInt,
  educationExpenses: nonNegativeInt,
}).omit({ 
  id: true, 
  createdAt: true,
  totalIncome: true,
  adjustedGrossIncome: true,
  totalAdjustments: true,
  itemizedDeductions: true,
  standardOrItemizedDeduction: true,
  taxableIncome: true,
  federalTaxBeforeCredits: true,
  estimatedTax: true,
  selfEmploymentTax: true,
  stateIncomeTax: true,
  alternativeMinimumTax: true,
  netInvestmentIncomeTax: true,
  totalCredits: true,
  earnedIncomeTaxCredit: true,
  refundableCredits: true,
  totalPayments: true,
  refundOrOwe: true,
  effectiveTaxRateBasisPoints: true,
}).superRefine((value, ctx) => {
  if (value.qualifiedDividends > value.dividendIncome) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Qualified dividends cannot exceed total dividends",
      path: ["qualifiedDividends"],
    });
  }

  if (value.filingStatus === "Married Filing Jointly" && value.spouseAge < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Spouse age is required for a joint return",
      path: ["spouseAge"],
    });
  }

  if (value.legacyAlimonyAgreement && value.alimonyPayments === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter the alimony paid for legacy agreements",
      path: ["alimonyPayments"],
    });
  }
});

export const taxCalculationSelectSchema = createSelectSchema(taxCalculations);

export const calculationResultSchema = z.object({
  totalIncome: z.number().int().min(0),
  adjustedGrossIncome: z.number().int().min(0),
  totalAdjustments: z.number().int().min(0),
  itemizedDeductions: z.number().int().min(0),
  deductionType: z.enum(["Standard", "Itemized"]),
  standardOrItemizedDeduction: z.number().int().min(0),
  taxableIncome: z.number().int().min(0),
  federalTaxBeforeCredits: z.number().int().min(0),
  estimatedTax: z.number().int().min(0),
  selfEmploymentTax: z.number().int().min(0),
  stateIncomeTax: z.number().int().min(0),
  alternativeMinimumTax: z.number().int().min(0),
  netInvestmentIncomeTax: z.number().int().min(0),
  totalCredits: z.number().int().min(0),
  earnedIncomeTaxCredit: z.number().int().min(0),
  refundableCredits: z.number().int().min(0),
  totalPayments: z.number().int().min(0),
  totalLiability: z.number().int().min(0),
  refundOrOwe: z.number().int(),
  effectiveTaxRate: z.number().min(0),
  stateEstimateSupported: z.boolean(),
});

export type TaxCalculation = typeof taxCalculations.$inferSelect;
export type InsertTaxCalculation = z.infer<typeof insertTaxCalculationSchema>;

export type CalculateTaxRequest = InsertTaxCalculation;

export type CalculationResult = {
  totalIncome: number;
  adjustedGrossIncome: number;
  totalAdjustments: number;
  itemizedDeductions: number;
  deductionType: "Standard" | "Itemized";
  standardOrItemizedDeduction: number;
  taxableIncome: number;
  federalTaxBeforeCredits: number;
  estimatedTax: number;
  selfEmploymentTax: number;
  stateIncomeTax: number;
  alternativeMinimumTax: number;
  netInvestmentIncomeTax: number;
  totalCredits: number;
  earnedIncomeTaxCredit: number;
  refundableCredits: number;
  totalPayments: number;
  totalLiability: number;
  refundOrOwe: number; // positive = refund, negative = owe
  effectiveTaxRate: number;
  stateEstimateSupported: boolean;
};

export type CalculateTaxResponse = z.infer<typeof calculationResultSchema>;
