import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export function calculateTax(input: any) {
  // --- 1. Total Income & Self-Employment Tax ---
  const netBusinessProfit = Math.max(0, (input.businessIncome || 0) - (input.businessExpenses || 0));
  
  // SE Tax Logic: 15.3% on 92.35% of net profit
  const seTaxableEarnings = netBusinessProfit * 0.9235;
  const selfEmploymentTax = Math.round(seTaxableEarnings * 0.153);
  
  // Deduct half of SE tax from AGI
  const seTaxDeduction = Math.floor(selfEmploymentTax / 2);
  
  const totalIncome = (input.wages || 0) + (input.spouseWages || 0) + netBusinessProfit + (input.interestIncome || 0) + (input.dividendIncome || 0) + (input.capitalGains || 0) + (input.longTermCapitalGains || 0) + (input.otherIncome || 0);
  
  // --- 2. Adjusted Gross Income (AGI) ---
  const adjustments = (input.iraContributions || 0) + (input.studentLoanInterest || 0) + seTaxDeduction;
  const adjustedGrossIncome = Math.max(0, totalIncome - adjustments);
  
  // --- 3. Deductions (Standard vs Itemized) ---
  const saltDeduction = Math.min(10000, (input.stateLocalTaxes || 0)); // SALT Cap
  const itemizedDeductions = (input.medicalExpenses || 0) + saltDeduction + (input.mortgageInterest || 0) + (input.charitableContributions || 0);
  
  // 2025 Standard Deduction Estimates
  let standardDeduction = 15000; // Single / MFS
  if (input.filingStatus === "Married Filing Jointly" || input.filingStatus === "Qualifying Surviving Spouse") standardDeduction = 30000;
  if (input.filingStatus === "Head of Household") standardDeduction = 22500;
  
  // Additional for age >= 65
  if (input.age >= 65) {
    standardDeduction += (input.filingStatus === "Married Filing Jointly" ? 1550 : 1950);
  }

  const standardOrItemizedDeduction = Math.max(standardDeduction, itemizedDeductions);
  const taxableIncome = Math.max(0, adjustedGrossIncome - standardOrItemizedDeduction);
  
  // --- 4. Federal Income Tax Calculation (Progressive Brackets) ---
  // Identify income types for preferential rates
  const prefRateIncome = (input.longTermCapitalGains || 0) + (input.qualifiedDividends || 0);
  const ordinaryIncome = Math.max(0, taxableIncome - prefRateIncome);

  function calculateProgressiveTax(income: number, status: string) {
    let brackets: { threshold: number, rate: number }[] = [];
    
    if (status === "Married Filing Jointly" || status === "Qualifying Surviving Spouse") {
      brackets = [
        { threshold: 23850, rate: 0.10 },
        { threshold: 96950, rate: 0.12 },
        { threshold: 206700, rate: 0.22 },
        { threshold: 394600, rate: 0.24 },
        { threshold: 501050, rate: 0.32 },
        { threshold: 751600, rate: 0.35 },
        { threshold: Infinity, rate: 0.37 },
      ];
    } else if (status === "Head of Household") {
      brackets = [
        { threshold: 17000, rate: 0.10 },
        { threshold: 64850, rate: 0.12 },
        { threshold: 103350, rate: 0.22 },
        { threshold: 197300, rate: 0.24 },
        { threshold: 250525, rate: 0.32 },
        { threshold: 626350, rate: 0.35 },
        { threshold: Infinity, rate: 0.37 },
      ];
    } else { // Single or MFS
      brackets = [
        { threshold: 11925, rate: 0.10 },
        { threshold: 48475, rate: 0.12 },
        { threshold: 103350, rate: 0.22 },
        { threshold: 197300, rate: 0.24 },
        { threshold: 250525, rate: 0.32 },
        { threshold: 626350, rate: 0.35 },
        { threshold: Infinity, rate: 0.37 },
      ];
    }

    let tax = 0;
    let prevThreshold = 0;
    for (const bracket of brackets) {
      if (income > prevThreshold) {
        const taxableInBracket = Math.min(income - prevThreshold, bracket.threshold - prevThreshold);
        tax += taxableInBracket * bracket.rate;
        prevThreshold = bracket.threshold;
      } else break;
    }
    return tax;
  }

  let estimatedTax = calculateProgressiveTax(ordinaryIncome, input.filingStatus);
  
  // Add preferential rate tax (simplified LTCG buckets)
  if (prefRateIncome > 0) {
    // Very simplified LTCG: 0% up to ~48k, 15% up to ~533k, 20% above
    // We calculate where LTCG starts on top of ordinary income
    let remainingPrefIncome = prefRateIncome;
    let currentIncomeLevel = ordinaryIncome;
    
    // 15% bracket start (assuming 0% ends at ~$48k Single / ~$96k Joint)
    const zeroPercentLimit = (input.filingStatus === "Married Filing Jointly" ? 96125 : 48060);
    const fifteenPercentLimit = (input.filingStatus === "Married Filing Jointly" ? 533400 : 533400); // simplified same limit for 20% start

    if (currentIncomeLevel < zeroPercentLimit) {
      const inZeroBracket = Math.min(remainingPrefIncome, zeroPercentLimit - currentIncomeLevel);
      remainingPrefIncome -= inZeroBracket;
      currentIncomeLevel += inZeroBracket;
    }
    
    if (remainingPrefIncome > 0 && currentIncomeLevel < fifteenPercentLimit) {
      const inFifteenBracket = Math.min(remainingPrefIncome, fifteenPercentLimit - currentIncomeLevel);
      estimatedTax += (inFifteenBracket * 0.15);
      remainingPrefIncome -= inFifteenBracket;
      currentIncomeLevel += inFifteenBracket;
    }
    
    if (remainingPrefIncome > 0) {
      estimatedTax += (remainingPrefIncome * 0.20);
    }
  }

  // --- 5. State Income Tax (Top 5 States) ---
  let stateIncomeTax = 0;
  const stateIncome = taxableIncome; // simplified base

  if (input.state === "California") {
    // CA Brackets (2025 est simplified)
    const caBrackets = [
      { threshold: 10412, rate: 0.01 },
      { threshold: 24684, rate: 0.02 },
      { threshold: 38959, rate: 0.04 },
      { threshold: 54081, rate: 0.06 },
      { threshold: 68350, rate: 0.08 },
      { threshold: 349137, rate: 0.093 },
      { threshold: 418961, rate: 0.103 },
      { threshold: 698271, rate: 0.113 },
      { threshold: Infinity, rate: 0.123 },
    ];
    let prevT = 0;
    for (const b of caBrackets) {
      if (stateIncome > prevT) {
        stateIncomeTax += Math.min(stateIncome - prevT, b.threshold - prevT) * b.rate;
        prevT = b.threshold;
      }
    }
  } else if (input.state === "New York") {
    // NY Brackets (simplified)
    const nyBrackets = [
      { threshold: 8500, rate: 0.04 },
      { threshold: 11700, rate: 0.045 },
      { threshold: 13900, rate: 0.0525 },
      { threshold: 21400, rate: 0.0585 },
      { threshold: 80650, rate: 0.0625 },
      { threshold: 215400, rate: 0.0685 },
      { threshold: 1077550, rate: 0.0965 },
      { threshold: Infinity, rate: 0.103 },
    ];
    let prevT = 0;
    for (const b of nyBrackets) {
      if (stateIncome > prevT) {
        stateIncomeTax += Math.min(stateIncome - prevT, b.threshold - prevT) * b.rate;
        prevT = b.threshold;
      }
    }
  } else if (input.state === "Illinois") {
    stateIncomeTax = stateIncome * 0.0495; // Flat rate
  } else if (input.state === "Texas" || input.state === "Florida") {
    stateIncomeTax = 0; // No income tax
  }

  // --- 6. Credits ---
  let totalCredits = input.childcareExpenses + input.energyImprovements + input.educationExpenses;
  // Child tax credit (~$2000 per child under 17)
  totalCredits += (input.dependentsUnder17 * 2000);
  // Other dependents (~$500)
  totalCredits += ((input.dependentsInSchool + input.otherDependents) * 500);
  
  // --- 7. Final Totals ---
  // Tax after credits (credits apply to federal income tax primarily)
  let federalIncomeTax = Math.max(0, estimatedTax - totalCredits);
  
  const totalLiability = federalIncomeTax + selfEmploymentTax + stateIncomeTax;
  const refundOrOwe = input.taxesWithheld - totalLiability;

  return {
    totalIncome: Math.round(totalIncome),
    adjustedGrossIncome: Math.round(adjustedGrossIncome),
    standardOrItemizedDeduction: Math.round(standardOrItemizedDeduction),
    taxableIncome: Math.round(taxableIncome),
    estimatedTax: Math.round(federalIncomeTax),
    selfEmploymentTax: Math.round(selfEmploymentTax),
    stateIncomeTax: Math.round(stateIncomeTax),
    totalCredits: Math.round(totalCredits),
    refundOrOwe: Math.round(refundOrOwe)
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post(api.tax.calculate.path, async (req, res) => {
    try {
      const input = api.tax.calculate.input.parse(req.body);
      const calcResult = calculateTax(input);
      
      const savedCalc = await storage.saveCalculation({
        ...input,
        ...calcResult,
      });
      
      res.status(200).json(savedCalc);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.tax.getRecent.path, async (req, res) => {
    const recent = await storage.getRecentCalculations();
    res.status(200).json(recent);
  });

  return httpServer;
}
