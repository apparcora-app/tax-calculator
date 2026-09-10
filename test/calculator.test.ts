import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateTax } from "../shared/calculator";
import type { CalculateTaxRequest } from "../shared/schema";

const baseInput: CalculateTaxRequest = {
  taxYear: 2025,
  filingStatus: "Single",
  state: "Other",
  age: 30,
  spouseAge: 0,
  canBeClaimedAsDependent: false,
  isFirstFourYearsCollege: false,
  legacyAlimonyAgreement: false,
  dependentsUnder17: 0,
  dependentsInSchool: 0,
  otherDependents: 0,
  wages: 0,
  spouseWages: 0,
  businessIncome: 0,
  businessExpenses: 0,
  taxesWithheld: 0,
  stateTaxesWithheld: 0,
  workplaceRetirementContributions: 0,
  interestIncome: 0,
  dividendIncome: 0,
  qualifiedDividends: 0,
  capitalGains: 0,
  longTermCapitalGains: 0,
  otherIncome: 0,
  iraContributions: 0,
  studentLoanInterest: 0,
  medicalExpenses: 0,
  stateLocalTaxes: 0,
  propertyTaxes: 0,
  mortgageInterest: 0,
  charitableContributions: 0,
  cashDonations: 0,
  nonCashDonations: 0,
  alimonyPayments: 0,
  childcareExpenses: 0,
  energyImprovements: 0,
  educationExpenses: 0,
};

describe("2025 Standard Deductions", () => {
  it("computes 2025 standard deduction for Single ($15,750)", () => {
    const res = calculateTax({ ...baseInput, wages: 50000 });
    assert.equal(res.standardOrItemizedDeduction, 15750);
    assert.equal(res.deductionType, "Standard");
    assert.equal(res.taxableIncome, 50000 - 15750);
  });

  it("computes 2025 standard deduction for Married Filing Jointly ($31,500)", () => {
    const res = calculateTax({ ...baseInput, filingStatus: "Married Filing Jointly", wages: 100000, spouseAge: 30 });
    assert.equal(res.standardOrItemizedDeduction, 31500);
    assert.equal(res.taxableIncome, 100000 - 31500);
  });

  it("computes 2025 standard deduction for Head of Household ($23,625)", () => {
    const res = calculateTax({ ...baseInput, filingStatus: "Head of Household", wages: 60000, dependentsUnder17: 1 });
    assert.equal(res.standardOrItemizedDeduction, 23625);
  });

  it("adds senior additional deduction for age >= 65 ($2,000 for Single)", () => {
    const res = calculateTax({ ...baseInput, age: 66, wages: 50000 });
    assert.equal(res.standardOrItemizedDeduction, 15750 + 2000);
  });

  it("adds senior additional deduction for both spouses age >= 65 ($1,600 each for MFJ)", () => {
    const res = calculateTax({
      ...baseInput,
      filingStatus: "Married Filing Jointly",
      age: 67,
      spouseAge: 65,
      wages: 100000,
    });
    assert.equal(res.standardOrItemizedDeduction, 31500 + 1600 + 1600);
  });

  it("caps dependent standard deduction properly ($1,350 floor)", () => {
    const res = calculateTax({
      ...baseInput,
      canBeClaimedAsDependent: true,
      wages: 500,
    });
    assert.equal(res.standardOrItemizedDeduction, 1350);
  });
});

describe("2025 Federal Tax Brackets & Stacking", () => {
  it("calculates exact 10% and 12% progressive brackets for Single", () => {
    // Single: $50,000 wages -> taxable income $34,250
    // 10% on first $11,925 = $1,192.50
    // 12% on ($34,250 - $11,925 = $22,325) = $2,679.00
    // Total ordinary tax = $3,871.50 -> rounds to $3,872
    const res = calculateTax({ ...baseInput, wages: 50000 });
    assert.equal(res.taxableIncome, 34250);
    assert.equal(res.federalTaxBeforeCredits, 3872);
  });

  it("switches to itemized deductions when itemized exceeds standard", () => {
    const res = calculateTax({
      ...baseInput,
      wages: 100000,
      mortgageInterest: 15000,
      charitableContributions: 10000,
      stateLocalTaxes: 8000,
    });
    assert.equal(res.deductionType, "Itemized");
    assert.equal(res.standardOrItemizedDeduction, 15000 + 10000 + 8000);
  });
});

describe("Self-Employment Tax (SECA)", () => {
  it("calculates 12.4% OASDI and 2.9% Medicare with 92.35% net earnings factor", () => {
    const res = calculateTax({
      ...baseInput,
      businessIncome: 100000,
      businessExpenses: 0,
    });
    // Net profit = $100,000
    // Net SE earnings = $92,350
    // SS tax = $92,350 * 0.124 = $11,451.40
    // Medicare tax = $92,350 * 0.029 = $2,678.15
    // Total SE tax = $14,129.55 -> rounds to $14,130
    assert.equal(res.selfEmploymentTax, 14130);
    // Above-the-line deduction = 50% of SE tax = $7,064.78 -> $7,065
    assert.equal(res.totalAdjustments, 7065);
  });

  it("caps Social Security portion at wage base limit ($176,100 for 2025)", () => {
    const res = calculateTax({
      ...baseInput,
      businessIncome: 300000,
    });
    // SE earnings = 300,000 * 0.9235 = $277,050
    // SS portion capped at $176,100 * 0.124 = $21,836.40
    // Medicare on full $277,050 * 0.029 = $8,034.45
    // Addl Medicare (over $200k) = (277,050 - 200,000) * 0.009 = $693.45
    // Total SE tax = 21,836.40 + 8,034.45 + 693.45 = $30,564.30 -> $30,564
    assert.equal(res.selfEmploymentTax, 30564);
  });
});

describe("Alternative Minimum Tax (AMT) & NIIT", () => {
  it("calculates Net Investment Income Tax (NIIT 3.8%) for high earners", () => {
    const res = calculateTax({
      ...baseInput,
      wages: 250000,
      dividendIncome: 30000,
      qualifiedDividends: 30000,
      capitalGains: 20000,
      longTermCapitalGains: 20000,
    });
    // Total income = $250,000 wages + $30,000 dividends + $20,000 STCG + $20,000 LTCG = $320,000.
    // MAGI exceeds $200k Single threshold by $120,000.
    // Net investment income = 30,000 + 20,000 + 20,000 = $70,000.
    // NIIT base = min($70,000, $120,000) = $70,000 * 0.038 = $2,660
    assert.equal(res.netInvestmentIncomeTax, 2660);
  });

  it("evaluates Form 6251 AMT when tentative minimum tax exceeds regular tax", () => {
    const res = calculateTax({
      ...baseInput,
      wages: 50000,
      longTermCapitalGains: 200000,
    });
    // Preferential capital gains rate reduces regular tax below the 26% AMT tentative tax
    assert.ok(res.alternativeMinimumTax > 0);
    assert.ok(res.federalTaxBeforeCredits >= res.alternativeMinimumTax);
  });
});

describe("Credits (Child Tax Credit, EITC, Education)", () => {
  it("applies $2,200 Child Tax Credit per qualifying child under 17", () => {
    const res = calculateTax({
      ...baseInput,
      wages: 80000,
      dependentsUnder17: 2,
    });
    assert.equal(res.totalCredits, 4400);
  });

  it("calculates Earned Income Tax Credit for eligible low-income taxpayers", () => {
    const res = calculateTax({
      ...baseInput,
      wages: 25000,
      dependentsUnder17: 1,
    });
    assert.ok(res.earnedIncomeTaxCredit > 0);
  });

  it("disqualifies EITC if investment income exceeds $11,950 limit", () => {
    const res = calculateTax({
      ...baseInput,
      wages: 25000,
      dependentsUnder17: 1,
      interestIncome: 12500,
    });
    assert.equal(res.earnedIncomeTaxCredit, 0);
  });
});

describe("State Income Tax Modeling", () => {
  it("models zero-tax states (Texas, Florida, Washington, etc.)", () => {
    const states = ["Texas", "Florida", "Washington", "Nevada", "Alaska", "Tennessee", "Wyoming", "South Dakota", "New Hampshire"] as const;
    for (const st of states) {
      const res = calculateTax({ ...baseInput, wages: 100000, state: st });
      assert.equal(res.stateIncomeTax, 0, `Expected 0 tax for ${st}`);
      assert.equal(res.stateEstimateSupported, true);
    }
  });

  it("computes progressive brackets for California", () => {
    const res = calculateTax({ ...baseInput, wages: 100000, state: "California" });
    assert.ok(res.stateIncomeTax > 0);
    assert.equal(res.stateEstimateSupported, true);
  });

  it("computes Massachusetts flat 5% plus 4% surtax above threshold", () => {
    const res = calculateTax({ ...baseInput, wages: 2000000, state: "Massachusetts" });
    // Base 5% on $2,000,000 = $100,000
    // Surtax on ($2,000,000 - $1,083,150 = $916,850) * 0.04 = $36,674
    // Total = $136,674
    assert.equal(res.stateIncomeTax, 136674);
  });
});
