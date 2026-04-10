import type { Express } from "express";
import type { Server } from "http";
import { api } from "@shared/routes";
import type { CalculateTaxRequest, CalculateTaxResponse } from "@shared/schema";
import { z } from "zod";

type FilingStatus = CalculateTaxRequest["filingStatus"];

type Bracket = {
  threshold: number;
  rate: number;
};

const SOCIAL_SECURITY_WAGE_BASE_2025 = 176100;
const SELF_EMPLOYMENT_EARNINGS_FACTOR = 0.9235;
const DEPENDENT_STANDARD_DEDUCTION_MINIMUM_2025 = 1350;
const DEPENDENT_STANDARD_DEDUCTION_ADDON_2025 = 450;
const WORKPLACE_RETIREMENT_DEFERRAL_LIMIT_2025 = 23500;

const STANDARD_DEDUCTION_2025: Record<FilingStatus, number> = {
  Single: 15750,
  "Married Filing Jointly": 31500,
  "Married Filing Separately": 15750,
  "Head of Household": 23625,
  "Qualifying Surviving Spouse": 31500,
};

const ORDINARY_TAX_BRACKETS_2025: Record<FilingStatus, Bracket[]> = {
  Single: [
    { threshold: 11925, rate: 0.1 },
    { threshold: 48475, rate: 0.12 },
    { threshold: 103350, rate: 0.22 },
    { threshold: 197300, rate: 0.24 },
    { threshold: 250525, rate: 0.32 },
    { threshold: 626350, rate: 0.35 },
    { threshold: Number.POSITIVE_INFINITY, rate: 0.37 },
  ],
  "Married Filing Jointly": [
    { threshold: 23850, rate: 0.1 },
    { threshold: 96950, rate: 0.12 },
    { threshold: 206700, rate: 0.22 },
    { threshold: 394600, rate: 0.24 },
    { threshold: 501050, rate: 0.32 },
    { threshold: 751600, rate: 0.35 },
    { threshold: Number.POSITIVE_INFINITY, rate: 0.37 },
  ],
  "Married Filing Separately": [
    { threshold: 11925, rate: 0.1 },
    { threshold: 48475, rate: 0.12 },
    { threshold: 103350, rate: 0.22 },
    { threshold: 197300, rate: 0.24 },
    { threshold: 250525, rate: 0.32 },
    { threshold: 375800, rate: 0.35 },
    { threshold: Number.POSITIVE_INFINITY, rate: 0.37 },
  ],
  "Head of Household": [
    { threshold: 17000, rate: 0.1 },
    { threshold: 64850, rate: 0.12 },
    { threshold: 103350, rate: 0.22 },
    { threshold: 197300, rate: 0.24 },
    { threshold: 250500, rate: 0.32 },
    { threshold: 626350, rate: 0.35 },
    { threshold: Number.POSITIVE_INFINITY, rate: 0.37 },
  ],
  "Qualifying Surviving Spouse": [
    { threshold: 23850, rate: 0.1 },
    { threshold: 96950, rate: 0.12 },
    { threshold: 206700, rate: 0.22 },
    { threshold: 394600, rate: 0.24 },
    { threshold: 501050, rate: 0.32 },
    { threshold: 751600, rate: 0.35 },
    { threshold: Number.POSITIVE_INFINITY, rate: 0.37 },
  ],
};

const LONG_TERM_CAPITAL_GAINS_THRESHOLDS_2025: Record<FilingStatus, { zero: number; fifteen: number }> = {
  Single: { zero: 48350, fifteen: 533400 },
  "Married Filing Jointly": { zero: 96700, fifteen: 600050 },
  "Married Filing Separately": { zero: 48350, fifteen: 300000 },
  "Head of Household": { zero: 64850, fifteen: 566700 },
  "Qualifying Surviving Spouse": { zero: 96700, fifteen: 600050 },
};

const STUDENT_LOAN_PHASEOUTS_2025: Record<FilingStatus, { start: number; end: number } | null> = {
  Single: { start: 85000, end: 100000 },
  "Married Filing Jointly": { start: 170000, end: 200000 },
  "Married Filing Separately": null,
  "Head of Household": { start: 85000, end: 100000 },
  "Qualifying Surviving Spouse": { start: 85000, end: 100000 },
};

const AOTC_PHASEOUTS_2025: Record<FilingStatus, { start: number; end: number } | null> = {
  Single: { start: 80000, end: 90000 },
  "Married Filing Jointly": { start: 160000, end: 180000 },
  "Married Filing Separately": null,
  "Head of Household": { start: 80000, end: 90000 },
  "Qualifying Surviving Spouse": { start: 80000, end: 90000 },
};

const ADDITIONAL_MEDICARE_THRESHOLDS: Record<FilingStatus, number> = {
  Single: 200000,
  "Married Filing Jointly": 250000,
  "Married Filing Separately": 125000,
  "Head of Household": 200000,
  "Qualifying Surviving Spouse": 200000,
};

function getWorkplaceRetirementLimit(age: number) {
  if (age >= 60 && age <= 63) {
    return WORKPLACE_RETIREMENT_DEFERRAL_LIMIT_2025 + 11250;
  }

  if (age >= 50) {
    return WORKPLACE_RETIREMENT_DEFERRAL_LIMIT_2025 + 7500;
  }

  return WORKPLACE_RETIREMENT_DEFERRAL_LIMIT_2025;
}

function clampToZero(value: number) {
  return Math.max(0, value);
}

function calculateTaxFromBrackets(income: number, brackets: Bracket[]) {
  let tax = 0;
  let previousThreshold = 0;

  for (const bracket of brackets) {
    if (income <= previousThreshold) {
      break;
    }

    const taxableInBracket = Math.min(income, bracket.threshold) - previousThreshold;
    tax += taxableInBracket * bracket.rate;
    previousThreshold = bracket.threshold;
  }

  return tax;
}

function applyLinearPhaseout(amount: number, income: number, start: number, end: number) {
  if (income <= start) {
    return amount;
  }

  if (income >= end) {
    return 0;
  }

  const remainingRatio = (end - income) / (end - start);
  return amount * remainingRatio;
}

function calculateStudentLoanDeduction(amount: number, filingStatus: FilingStatus, magi: number) {
  const cappedAmount = Math.min(amount, 2500);
  const phaseout = STUDENT_LOAN_PHASEOUTS_2025[filingStatus];

  if (!phaseout) {
    return 0;
  }

  return applyLinearPhaseout(cappedAmount, magi, phaseout.start, phaseout.end);
}

function calculateSaltDeduction(stateLocalTaxes: number, filingStatus: FilingStatus, adjustedGrossIncome: number) {
  const highIncomeThreshold = filingStatus === "Married Filing Separately" ? 250000 : 500000;
  const maxDeduction = filingStatus === "Married Filing Separately" ? 20000 : 40000;
  const floorDeduction = filingStatus === "Married Filing Separately" ? 5000 : 10000;

  let deductionCap = maxDeduction;

  if (adjustedGrossIncome > highIncomeThreshold) {
    deductionCap = Math.max(
      floorDeduction,
      maxDeduction - ((adjustedGrossIncome - highIncomeThreshold) * 0.3),
    );
  }

  return Math.min(stateLocalTaxes, deductionCap);
}

function calculateDependentStandardDeduction(earnedIncome: number, regularStandardDeduction: number, additionalStandardDeduction: number) {
  const baseDeduction = Math.max(
    DEPENDENT_STANDARD_DEDUCTION_MINIMUM_2025,
    Math.min(
      Math.max(0, earnedIncome),
      regularStandardDeduction - DEPENDENT_STANDARD_DEDUCTION_ADDON_2025,
    ) + DEPENDENT_STANDARD_DEDUCTION_ADDON_2025,
  );

  return Math.min(
    regularStandardDeduction + additionalStandardDeduction,
    baseDeduction + additionalStandardDeduction,
  );
}

function calculateChildTaxCredit(adjustedGrossIncome: number, filingStatus: FilingStatus, qualifyingChildren: number, otherDependents: number) {
  const maxCredit = (qualifyingChildren * 2200) + (otherDependents * 500);
  const phaseoutThreshold = filingStatus === "Married Filing Jointly" ? 400000 : 200000;

  if (adjustedGrossIncome <= phaseoutThreshold) {
    return maxCredit;
  }

  const reduction = Math.ceil((adjustedGrossIncome - phaseoutThreshold) / 1000) * 50;
  return Math.max(0, maxCredit - reduction);
}

function calculateAdditionalChildTaxCredit(earnedIncome: number, qualifyingChildren: number, unusedChildTaxCredit: number) {
  if (qualifyingChildren === 0 || unusedChildTaxCredit <= 0) {
    return 0;
  }

  const earnedIncomeBasedAmount = Math.max(0, earnedIncome - 2500) * 0.15;
  const perChildCap = qualifyingChildren * 1700;

  return Math.max(0, Math.min(unusedChildTaxCredit, earnedIncomeBasedAmount, perChildCap));
}

function calculateDependentCareCredit(expenses: number, qualifyingDependents: number, adjustedGrossIncome: number, filingStatus: FilingStatus, earnedIncomeLimit: number) {
  if (expenses <= 0 || qualifyingDependents <= 0 || filingStatus === "Married Filing Separately") {
    return 0;
  }

  const expenseCap = qualifyingDependents >= 2 ? 6000 : 3000;
  const allowableExpenses = Math.min(expenses, expenseCap, earnedIncomeLimit);

  if (allowableExpenses <= 0) {
    return 0;
  }

  const reductionSteps = Math.ceil(Math.max(0, adjustedGrossIncome - 15000) / 2000);
  const rate = Math.max(0.2, 0.35 - (reductionSteps * 0.01));

  return allowableExpenses * rate;
}

function calculateAmericanOpportunityCredit(expenses: number, students: number, adjustedGrossIncome: number, filingStatus: FilingStatus) {
  const phaseout = AOTC_PHASEOUTS_2025[filingStatus];
  if (expenses <= 0 || students <= 0 || !phaseout) {
    return 0;
  }

  let remainingExpenses = expenses;
  let credit = 0;

  for (let index = 0; index < students; index += 1) {
    const expensesForStudent = Math.min(remainingExpenses, 4000);
    if (expensesForStudent <= 0) {
      break;
    }

    credit += Math.min(expensesForStudent, 2000);
    credit += Math.max(0, Math.min(expensesForStudent - 2000, 2000)) * 0.25;
    remainingExpenses -= expensesForStudent;
  }

  return applyLinearPhaseout(credit, adjustedGrossIncome, phaseout.start, phaseout.end);
}

function calculateLifetimeLearningCredit(expenses: number, adjustedGrossIncome: number, filingStatus: FilingStatus) {
  const phaseout = AOTC_PHASEOUTS_2025[filingStatus];
  if (expenses <= 0 || !phaseout) {
    return 0;
  }

  const credit = Math.min(expenses, 10000) * 0.2;
  return applyLinearPhaseout(credit, adjustedGrossIncome, phaseout.start, phaseout.end);
}

function calculateStateIncomeTax(state: CalculateTaxRequest["state"], adjustedGrossIncome: number, taxableIncome: number) {
  const flatTaxBase = clampToZero(adjustedGrossIncome);
  const progressiveTaxBase = clampToZero(taxableIncome);

  if (state === "California") {
    return calculateTaxFromBrackets(progressiveTaxBase, [
      { threshold: 10412, rate: 0.01 },
      { threshold: 24684, rate: 0.02 },
      { threshold: 38959, rate: 0.04 },
      { threshold: 54081, rate: 0.06 },
      { threshold: 68350, rate: 0.08 },
      { threshold: 349137, rate: 0.093 },
      { threshold: 418961, rate: 0.103 },
      { threshold: 698271, rate: 0.113 },
      { threshold: Number.POSITIVE_INFINITY, rate: 0.123 },
    ]);
  }

  if (state === "New York") {
    return calculateTaxFromBrackets(progressiveTaxBase, [
      { threshold: 8500, rate: 0.04 },
      { threshold: 11700, rate: 0.045 },
      { threshold: 13900, rate: 0.0525 },
      { threshold: 21400, rate: 0.0585 },
      { threshold: 80650, rate: 0.0625 },
      { threshold: 215400, rate: 0.0685 },
      { threshold: 1077550, rate: 0.0965 },
      { threshold: Number.POSITIVE_INFINITY, rate: 0.103 },
    ]);
  }

  if (state === "Arizona") {
    return flatTaxBase * 0.025;
  }

  if (state === "Colorado") {
    return flatTaxBase * 0.044;
  }

  if (state === "Illinois") {
    return flatTaxBase * 0.0495;
  }

  if (state === "Michigan") {
    return flatTaxBase * 0.0425;
  }

  if (state === "North Carolina") {
    return flatTaxBase * 0.0425;
  }

  if (state === "Pennsylvania") {
    return flatTaxBase * 0.0307;
  }

  return 0;
}

export function calculateTax(input: CalculateTaxRequest): CalculateTaxResponse {
  const filingStatus = input.filingStatus;
  const netBusinessProfit = clampToZero(input.businessIncome - input.businessExpenses);
  const workplaceRetirementCap = getWorkplaceRetirementLimit(input.age) + (
    filingStatus === "Married Filing Jointly" ? getWorkplaceRetirementLimit(input.spouseAge) : 0
  );
  const workplaceRetirementDeduction = Math.min(
    input.workplaceRetirementContributions,
    workplaceRetirementCap,
    input.wages + input.spouseWages,
  );
  const wageIncomeAfterDeferrals = clampToZero((input.wages + input.spouseWages) - workplaceRetirementDeduction);
  const selfEmploymentNetEarnings = netBusinessProfit * SELF_EMPLOYMENT_EARNINGS_FACTOR;
  const selfEmploymentSocialSecurityBase = Math.max(0, SOCIAL_SECURITY_WAGE_BASE_2025 - input.wages);
  const socialSecurityTax = Math.min(selfEmploymentNetEarnings, selfEmploymentSocialSecurityBase) * 0.124;
  const medicareTax = selfEmploymentNetEarnings * 0.029;
  const reducedAdditionalMedicareThreshold = Math.max(0, ADDITIONAL_MEDICARE_THRESHOLDS[filingStatus] - input.wages - input.spouseWages);
  const additionalMedicareTax = Math.max(0, selfEmploymentNetEarnings - reducedAdditionalMedicareThreshold) * 0.009;
  const deductibleSelfEmploymentTax = (socialSecurityTax + medicareTax) / 2;
  const selfEmploymentTax = socialSecurityTax + medicareTax + additionalMedicareTax;

  const totalIncome =
    wageIncomeAfterDeferrals +
    netBusinessProfit +
    input.interestIncome +
    input.dividendIncome +
    input.capitalGains +
    input.longTermCapitalGains +
    input.otherIncome;

  const compensation = clampToZero(input.wages + netBusinessProfit);
  const iraContributionCap = input.age >= 50 ? 8000 : 7000;
  const iraDeduction = Math.min(input.iraContributions, iraContributionCap, compensation);
  const alimonyDeduction = input.legacyAlimonyAgreement ? input.alimonyPayments : 0;

  const provisionalAdjustedGrossIncome = clampToZero(
    totalIncome - iraDeduction - deductibleSelfEmploymentTax - alimonyDeduction,
  );
  const studentLoanDeduction = calculateStudentLoanDeduction(
    input.studentLoanInterest,
    filingStatus,
    provisionalAdjustedGrossIncome,
  );

  const adjustedGrossIncome = clampToZero(
    totalIncome - iraDeduction - deductibleSelfEmploymentTax - studentLoanDeduction - alimonyDeduction,
  );
  const totalAdjustments = iraDeduction + deductibleSelfEmploymentTax + studentLoanDeduction + alimonyDeduction;

  const medicalDeduction = Math.max(0, input.medicalExpenses - (adjustedGrossIncome * 0.075));
  const saltDeduction = calculateSaltDeduction(
    input.stateLocalTaxes + input.propertyTaxes,
    filingStatus,
    adjustedGrossIncome,
  );
  const charitableContributions = input.charitableContributions + input.cashDonations + input.nonCashDonations;
  const itemizedDeductions =
    medicalDeduction +
    saltDeduction +
    input.mortgageInterest +
    charitableContributions;

  const taxpayerAdditionalStandardDeduction = input.age >= 65
    ? (filingStatus === "Single" || filingStatus === "Head of Household" ? 2000 : 1600)
    : 0;
  const spouseAdditionalStandardDeduction =
    filingStatus === "Married Filing Jointly" && input.spouseAge >= 65 ? 1600 : 0;
  const additionalStandardDeduction = taxpayerAdditionalStandardDeduction + spouseAdditionalStandardDeduction;
  const standardDeductionBase = STANDARD_DEDUCTION_2025[filingStatus];
  const earnedIncomeForDependentStandardDeduction = wageIncomeAfterDeferrals + netBusinessProfit;
  const standardDeduction = input.canBeClaimedAsDependent && filingStatus !== "Married Filing Jointly"
    ? calculateDependentStandardDeduction(
        earnedIncomeForDependentStandardDeduction,
        standardDeductionBase,
        additionalStandardDeduction,
      )
    : standardDeductionBase + additionalStandardDeduction;

  const standardOrItemizedDeduction = Math.max(
    standardDeduction,
    itemizedDeductions,
  );
  const deductionType = itemizedDeductions > standardDeduction ? "Itemized" : "Standard";

  const taxableIncome = clampToZero(adjustedGrossIncome - standardOrItemizedDeduction);
  const preferentialIncome = Math.min(
    taxableIncome,
    input.longTermCapitalGains + input.qualifiedDividends,
  );
  const ordinaryTaxableIncome = clampToZero(taxableIncome - preferentialIncome);

  let federalTaxBeforeCredits = calculateTaxFromBrackets(
    ordinaryTaxableIncome,
    ORDINARY_TAX_BRACKETS_2025[filingStatus],
  );

  if (preferentialIncome > 0) {
    const thresholds = LONG_TERM_CAPITAL_GAINS_THRESHOLDS_2025[filingStatus];
    const zeroRateRoom = Math.max(0, thresholds.zero - ordinaryTaxableIncome);
    const zeroRateIncome = Math.min(preferentialIncome, zeroRateRoom);
    const fifteenRateRoom = Math.max(0, thresholds.fifteen - ordinaryTaxableIncome - zeroRateIncome);
    const fifteenRateIncome = Math.min(preferentialIncome - zeroRateIncome, fifteenRateRoom);
    const twentyRateIncome = preferentialIncome - zeroRateIncome - fifteenRateIncome;

    federalTaxBeforeCredits += (fifteenRateIncome * 0.15) + (twentyRateIncome * 0.2);
  }

  const otherDependents = input.dependentsInSchool + input.otherDependents;
  const childTaxCreditTotal = calculateChildTaxCredit(
    adjustedGrossIncome,
    filingStatus,
    input.dependentsUnder17,
    otherDependents,
  );

  const qualifyingDependentsForCare = Math.min(
    input.dependentsUnder17 + otherDependents,
    2,
  );
  const earnedIncomeForCareCredit =
    filingStatus === "Married Filing Jointly"
      ? Math.min(input.wages + netBusinessProfit, input.spouseWages)
      : input.wages + netBusinessProfit;
  const dependentCareCredit = calculateDependentCareCredit(
    input.childcareExpenses,
    qualifyingDependentsForCare,
    adjustedGrossIncome,
    filingStatus,
    Math.max(0, earnedIncomeForCareCredit),
  );

  const energyCredit = input.energyImprovements * 0.3;
  const educationStudents = Math.max(
    input.dependentsInSchool,
    input.educationExpenses > 0 ? 1 : 0,
  );
  const fullAmericanOpportunityCredit = input.isFirstFourYearsCollege
    ? calculateAmericanOpportunityCredit(
        input.educationExpenses,
        educationStudents,
        adjustedGrossIncome,
        filingStatus,
      )
    : 0;
  const refundableEducationCredit = Math.min(
    fullAmericanOpportunityCredit * 0.4,
    educationStudents * 1000,
  );
  const nonRefundableEducationCredit = input.isFirstFourYearsCollege
    ? Math.max(0, fullAmericanOpportunityCredit - refundableEducationCredit)
    : calculateLifetimeLearningCredit(
        input.educationExpenses,
        adjustedGrossIncome,
        filingStatus,
      );

  const otherNonRefundableCredits =
    dependentCareCredit +
    energyCredit +
    nonRefundableEducationCredit;
  const otherNonRefundableCreditsApplied = Math.min(federalTaxBeforeCredits, otherNonRefundableCredits);
  const remainingFederalTaxAfterOtherCredits = Math.max(0, federalTaxBeforeCredits - otherNonRefundableCreditsApplied);
  const childTaxCreditApplied = Math.min(childTaxCreditTotal, remainingFederalTaxAfterOtherCredits);
  const totalCredits = otherNonRefundableCreditsApplied + childTaxCreditApplied;
  const remainingChildTaxCredit = Math.max(
    0,
    childTaxCreditTotal - childTaxCreditApplied,
  );
  const earnedIncomeForActc = input.wages + input.spouseWages + netBusinessProfit;
  const refundableCredits = calculateAdditionalChildTaxCredit(
    earnedIncomeForActc,
    input.dependentsUnder17,
    remainingChildTaxCredit,
  ) + refundableEducationCredit;

  const estimatedTax = Math.max(0, federalTaxBeforeCredits - totalCredits);
  const stateIncomeTax = calculateStateIncomeTax(input.state, adjustedGrossIncome, taxableIncome);
  const totalPayments = input.taxesWithheld + input.stateTaxesWithheld;
  const totalLiability = estimatedTax + selfEmploymentTax + stateIncomeTax;
  const refundOrOwe = totalPayments + refundableCredits - totalLiability;
  const effectiveTaxRate = totalIncome > 0 ? (totalLiability / totalIncome) * 100 : 0;

  return {
    totalIncome: Math.round(totalIncome),
    adjustedGrossIncome: Math.round(adjustedGrossIncome),
    totalAdjustments: Math.round(totalAdjustments),
    itemizedDeductions: Math.round(itemizedDeductions),
    deductionType,
    standardOrItemizedDeduction: Math.round(standardOrItemizedDeduction),
    taxableIncome: Math.round(taxableIncome),
    federalTaxBeforeCredits: Math.round(federalTaxBeforeCredits),
    estimatedTax: Math.round(estimatedTax),
    selfEmploymentTax: Math.round(selfEmploymentTax),
    stateIncomeTax: Math.round(stateIncomeTax),
    totalCredits: Math.round(totalCredits),
    refundableCredits: Math.round(refundableCredits),
    totalPayments: Math.round(totalPayments),
    totalLiability: Math.round(totalLiability),
    refundOrOwe: Math.round(refundOrOwe),
    effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
  };
}

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
