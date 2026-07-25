# Project Summary: US Tax Calculator 2025

## 1. Overview
The **US Tax Calculator 2025** is a full-featured web application that estimates 2025 US Federal and State income taxes, deductions, credits, self-employment taxes, Alternative Minimum Tax (AMT), Net Investment Income Tax (NIIT), and Earned Income Tax Credit (EITC).

The application is architected to run **100% serverlessly on client side** via static hosting on **Firebase Hosting** (`https://us-tax-calculator.web.app`), while also maintaining a Node.js Express server for development mode.

---

## 2. Tech Stack & Architecture

- **Frontend**: React 18, Vite 7, TypeScript, Tailwind CSS, Shadcn UI components, Lucide React icons, Wouter (lightweight routing), TanStack React Query.
- **Tax Calculation Engine**: `@shared/calculator.ts` (Pure TypeScript tax calculation logic containing 2025 IRS brackets, standard deductions, phaseout formulas, state tax rules).
- **Backend / Dev Mode**: Node.js Express server (`server/index.ts` & `server/routes.ts`), Drizzle ORM schema (`shared/schema.ts`).
- **Deployment**: Firebase Hosting (Static SPA from `dist/public`).
- **Live URLs**:
  - `https://us-tax-calculator.web.app`
  - `https://us-tax-calculator.firebaseapp.com`
- **GitHub Repository**: `https://github.com/loyaltaxservicesofficial-lab/tax-calculator`

---

## 3. Directory Structure

```
Tax-Calculator/
├── client/                     # Frontend Application
│   ├── src/
│   │   ├── components/        # UI components (Form controls, cards, results display)
│   │   ├── hooks/
│   │   │   └── use-tax.ts     # Tax calculation hook (API call + client-side static engine fallback)
│   │   ├── pages/             # Main pages (CalculatorForm.tsx, etc.)
│   │   ├── App.tsx            # Main router & app layout
│   │   ├── index.css          # Tailwind CSS styling
│   │   └── main.tsx           # Entry point
│   └── index.html             # Single Page App index
├── shared/                     # Shared Types & Business Logic
│   ├── calculator.ts          # Core 2025 Tax Calculation Engine (Decoupled pure logic)
│   ├── schema.ts              # Zod validation schemas & TypeScript types
│   └── routes.ts              # API endpoint definitions
├── server/                     # Dev Express Backend
│   ├── index.ts               # Express server entry point
│   └── routes.ts              # API route definitions (/api/calculate)
├── script/
│   └── build.ts               # Build script compiling Vite client -> dist/public
├── firebase.json              # Firebase Hosting configuration (site: us-tax-calculator)
├── .firebaserc                # Firebase Project ID configuration (project: arcora-cd7d0)
├── package.json               # Dependencies and scripts (npm run dev, build, deploy:firebase)
└── tsconfig.json              # TypeScript configuration
```

---

## 4. Key Calculation Rules & Capabilities (2025 Tax Year)

1. **Filing Statuses**:
   - Single, Married Filing Jointly, Married Filing Separately, Head of Household, Qualifying Surviving Spouse.
2. **2025 Standard Deductions**:
   - Single: $15,750
   - Married Filing Jointly: $31,500
   - Married Filing Separately: $15,750
   - Head of Household: $23,625
   - Qualifying Surviving Spouse: $31,500
   - Additional standard deductions for age >= 65 and dependents.
3. **Ordinary Federal Tax Brackets (2025)**:
   - 10%, 12%, 22%, 24%, 32%, 35%, 37% brackets adjusted per filing status.
4. **Capital Gains & Qualified Dividends**:
   - 0%, 15%, 20% preferential rates based on taxable income thresholds.
5. **Self-Employment Tax**:
   - 12.4% Social Security (wage base cap $176,100), 2.9% Medicare, 0.9% Additional Medicare Tax. 50% SE tax deduction applied to AGI.
6. **Deductions & Adjustments**:
   - Educator expenses, IRA contributions, workplace retirement caps ($23,500 + catch-up), Student loan interest phaseouts, SALT deduction ($10,000 / $40,000 caps), Medical expense 7.5% AGI floor, Mortgage interest, Charitable donations.
7. **Credits**:
   - Child Tax Credit ($2,200/child with phaseout), Additional Child Tax Credit (ACTC refundable portion), Childcare & Dependent Care Credit, American Opportunity Tax Credit (AOTC), Lifetime Learning Credit (LLC), Residential Energy Improvements (30%), Earned Income Tax Credit (EITC).
8. **State Tax Estimates**:
   - Built-in estimates for CA, NY, MA, AZ, CO, GA, IL, KY, MI, NC, PA, UT, and no-income-tax states (AK, FL, NV, NH, SD, TN, TX, WA, WY).

---

## 5. Input Schema (`CalculateTaxRequest`)

```ts
{
  taxYear: 2025,
  filingStatus: "Single" | "Married Filing Jointly" | "Married Filing Separately" | "Head of Household" | "Qualifying Surviving Spouse",
  state: string,
  age: number,
  spouseAge: number,
  canBeClaimedAsDependent: boolean,
  isFirstFourYearsCollege: boolean,
  legacyAlimonyAgreement: boolean,
  dependentsUnder17: number,
  dependentsInSchool: number,
  otherDependents: number,

  // Income
  wages: number,
  spouseWages: number,
  businessIncome: number,
  businessExpenses: number,
  taxesWithheld: number,
  stateTaxesWithheld: number,
  workplaceRetirementContributions: number,
  interestIncome: number,
  dividendIncome: number,
  qualifiedDividends: number,
  capitalGains: number,
  longTermCapitalGains: number,
  otherIncome: number,

  // Deductions & Credits
  iraContributions: number,
  studentLoanInterest: number,
  medicalExpenses: number,
  stateLocalTaxes: number,
  propertyTaxes: number,
  mortgageInterest: number,
  charitableContributions: number,
  cashDonations: number,
  nonCashDonations: number,
  alimonyPayments: number,
  childcareExpenses: number,
  energyImprovements: number,
  educationExpenses: number,
}
```

---

## 6. Output Schema (`CalculateTaxResponse`)

```ts
{
  totalIncome: number,
  adjustedGrossIncome: number,
  totalAdjustments: number,
  itemizedDeductions: number,
  deductionType: "Standard" | "Itemized",
  standardOrItemizedDeduction: number,
  taxableIncome: number,
  federalTaxBeforeCredits: number,
  estimatedTax: number,
  selfEmploymentTax: number,
  stateIncomeTax: number,
  alternativeMinimumTax: number,
  netInvestmentIncomeTax: number,
  totalCredits: number,
  earnedIncomeTaxCredit: number,
  refundableCredits: number,
  totalPayments: number,
  totalLiability: number,
  refundOrOwe: number, // Positive = Refund, Negative = Tax Owed
  effectiveTaxRate: number, // Percentage e.g. 15.25%
  stateEstimateSupported: boolean,
}
```

---

## 7. Key Operational Commands

```bash
# Start local development server
npm run dev

# Run TypeScript compilation check
npm run check

# Build production bundle to dist/public
npm run build

# Deploy statically to Firebase Hosting (us-tax-calculator.web.app)
npm run deploy:firebase
```
