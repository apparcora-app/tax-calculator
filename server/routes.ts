import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

function calculateTax(input: any) {
  // Simple US Tax Calculation Logic (Estimates for 2025)
  // Income
  const totalIncome = input.wages + input.spouseWages + input.businessIncome + input.interestIncome + input.dividendIncome + input.capitalGains + input.otherIncome;
  
  // Adjustments to Income (above the line deductions)
  const adjustments = input.iraContributions + input.studentLoanInterest;
  const adjustedGrossIncome = Math.max(0, totalIncome - adjustments);
  
  // Itemized Deductions
  const itemizedDeductions = input.medicalExpenses + input.stateLocalTaxes + input.mortgageInterest + input.charitableContributions;
  
  // Standard Deduction (2025 est)
  let standardDeduction = 15000; // Single
  if (input.filingStatus === "Married Filing Jointly") standardDeduction = 30000;
  if (input.filingStatus === "Head of Household") standardDeduction = 22500;
  
  // Additional standard deduction for age >= 65
  if (input.age >= 65) {
    standardDeduction += (input.filingStatus === "Married Filing Jointly" ? 1550 : 1950);
  }

  const standardOrItemizedDeduction = Math.max(standardDeduction, itemizedDeductions);
  const taxableIncome = Math.max(0, adjustedGrossIncome - standardOrItemizedDeduction);
  
  // Very simplified tax brackets
  let estimatedTax = 0;
  if (taxableIncome > 0) {
    // Let's do a slightly more realistic progressive bracket
    if (input.filingStatus === "Married Filing Jointly") {
      if (taxableIncome <= 23850) estimatedTax = taxableIncome * 0.10;
      else if (taxableIncome <= 96950) estimatedTax = 2385 + (taxableIncome - 23850) * 0.12;
      else estimatedTax = 11157 + (taxableIncome - 96950) * 0.22;
    } else {
      if (taxableIncome <= 11925) estimatedTax = taxableIncome * 0.10;
      else if (taxableIncome <= 48475) estimatedTax = 1192.5 + (taxableIncome - 11925) * 0.12;
      else estimatedTax = 5578.5 + (taxableIncome - 48475) * 0.22;
    }
  }

  // Credits
  let totalCredits = input.childcareExpenses + input.energyImprovements + input.educationExpenses;
  // Child tax credit (~$2000 per child under 17)
  totalCredits += (input.dependentsUnder17 * 2000);
  // Other dependents (~$500)
  totalCredits += ((input.dependentsInSchool + input.otherDependents) * 500);
  
  // Tax after credits (non-refundable credits can't take tax below 0, but for simplicity we allow refund)
  // Actual child tax credit is partially refundable. 
  let taxAfterCredits = Math.max(0, estimatedTax - totalCredits);
  
  const refundOrOwe = input.taxesWithheld - taxAfterCredits;

  return {
    totalIncome,
    adjustedGrossIncome,
    standardOrItemizedDeduction,
    taxableIncome,
    estimatedTax: Math.round(estimatedTax),
    totalCredits,
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
