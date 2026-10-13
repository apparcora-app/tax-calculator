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

const nonNegativeInt = z.number().int().min(0).default(0);

export const insertTaxCalculationSchema = z.object({
  taxYear: z.number().int().min(2025).max(2025).default(2025),
  filingStatus: z.enum(filingStatusValues),
  state: z.enum(stateValues).default("Other"),
  age: z.number().int().min(1).max(120),
  spouseAge: z.number().int().min(0).max(120).default(0),
  canBeClaimedAsDependent: z.boolean().default(false),
  isFirstFourYearsCollege: z.boolean().default(false),
  legacyAlimonyAgreement: z.boolean().default(false),
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

export type InsertTaxCalculation = z.infer<typeof insertTaxCalculationSchema>;
export type CalculateTaxRequest = InsertTaxCalculation;

export type CalculationResult = z.infer<typeof calculationResultSchema>;
export type CalculateTaxResponse = CalculationResult;

export interface TaxCalculationRecord extends InsertTaxCalculation {
  id: string;
  createdAt: string;
  results: CalculationResult;
}

export type TaxCalculation = TaxCalculationRecord;
