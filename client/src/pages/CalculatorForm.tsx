import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  PieChart as PieChartIcon,
  RefreshCcw
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

import { useCalculateTax } from "@/hooks/use-tax";
import { Layout } from "@/components/Layout";
import { Label, Input, MoneyInput, Button, RadioCardGroup } from "@/components/FormControls";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------
// Frontend Form Schema (with aggressive coercion for string HTML inputs)
// ----------------------------------------------------------------------
const formSchema = z.object({
  // Basic Info
  taxYear: z.coerce.number().default(2025),
  filingStatus: z.string().min(1, "Please select a filing status"),
  age: z.coerce.number().min(1, "Age is required").max(120, "Invalid age"),
  dependentsUnder17: z.coerce.number().default(0),
  dependentsInSchool: z.coerce.number().default(0),
  otherDependents: z.coerce.number().default(0),

  // Income
  wages: z.coerce.number().default(0),
  spouseWages: z.coerce.number().default(0),
  businessIncome: z.coerce.number().default(0),
  taxesWithheld: z.coerce.number().default(0),
  interestIncome: z.coerce.number().default(0),
  dividendIncome: z.coerce.number().default(0),
  capitalGains: z.coerce.number().default(0),
  otherIncome: z.coerce.number().default(0),

  // Deductions
  iraContributions: z.coerce.number().default(0),
  studentLoanInterest: z.coerce.number().default(0),
  medicalExpenses: z.coerce.number().default(0),
  stateLocalTaxes: z.coerce.number().default(0),
  mortgageInterest: z.coerce.number().default(0),
  charitableContributions: z.coerce.number().default(0),

  // Credits
  childcareExpenses: z.coerce.number().default(0),
  energyImprovements: z.coerce.number().default(0),
  educationExpenses: z.coerce.number().default(0),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  taxYear: 2025,
  filingStatus: "Single",
  age: 30,
  dependentsUnder17: 0,
  dependentsInSchool: 0,
  otherDependents: 0,
  wages: 0,
  spouseWages: 0,
  businessIncome: 0,
  taxesWithheld: 0,
  interestIncome: 0,
  dividendIncome: 0,
  capitalGains: 0,
  otherIncome: 0,
  iraContributions: 0,
  studentLoanInterest: 0,
  medicalExpenses: 0,
  stateLocalTaxes: 0,
  mortgageInterest: 0,
  charitableContributions: 0,
  childcareExpenses: 0,
  energyImprovements: 0,
  educationExpenses: 0,
};

// ----------------------------------------------------------------------
// Main Page Component
// ----------------------------------------------------------------------
export default function CalculatorForm() {
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  
  const calculateMutation = useCalculateTax();

  const { register, handleSubmit, control, watch, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onBlur"
  });

  const filingStatus = watch("filingStatus");
  const showSpouseFields = filingStatus === "Married Filing Jointly";

  const onSubmit = (data: FormValues) => {
    // Only submit on the last step
    if (step === totalSteps) {
      calculateMutation.mutate(data);
    } else {
      nextStep();
    }
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const restart = () => {
    reset(defaultValues);
    setStep(1);
    calculateMutation.reset();
  };

  // ----------------------------------------------------------------------
  // Results View (Rendered when mutation succeeds)
  // ----------------------------------------------------------------------
  if (calculateMutation.isSuccess && calculateMutation.data) {
    const result = calculateMutation.data;
    const isRefund = result.refundOrOwe > 0;
    const absAmount = Math.abs(result.refundOrOwe);
    
    // Chart data
    const chartData = [
      { name: 'Taxable Income', value: result.taxableIncome, color: 'hsl(var(--primary))' },
      { name: 'Deductions', value: result.standardOrItemizedDeduction, color: 'hsl(var(--muted-foreground))' },
      { name: 'Tax Free (Other)', value: Math.max(0, result.totalIncome - result.taxableIncome - result.standardOrItemizedDeduction), color: 'hsl(var(--secondary))' }
    ].filter(d => d.value > 0);

    return (
      <Layout>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-3 bg-primary/5 rounded-2xl mb-4">
              <PieChartIcon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-display font-extrabold text-foreground">
              Your 2025 Tax Estimate
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Based on the information provided, here is your estimated tax scenario.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Highlight Card */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="glass-card rounded-3xl p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                
                <h2 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-2">
                  ESTIMATED {isRefund ? "REFUND" : "AMOUNT OWED"}
                </h2>
                
                <div className={`text-5xl font-display font-extrabold tracking-tight mb-2 ${
                  isRefund ? "text-green-600" : "text-destructive"
                }`}>
                  ${absAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                
                <div className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full bg-muted mt-2">
                  {isRefund ? (
                    <><CheckCircle2 className="w-4 h-4 text-green-600" /> Great news!</>
                  ) : (
                    <><AlertCircle className="w-4 h-4 text-destructive" /> Plan accordingly</>
                  )}
                </div>
              </div>

              <div className="glass-card rounded-3xl p-6">
                <h3 className="font-display font-bold mb-4">Visual Breakdown</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2 text-xs font-medium text-muted-foreground">
                  {chartData.map(d => (
                    <span key={d.name} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Breakdown List */}
            <div className="lg:col-span-2 glass-card rounded-3xl p-8">
              <h3 className="font-display text-2xl font-bold mb-6">Detailed Summary</h3>
              
              <div className="space-y-4">
                <ResultRow label="Total Income" value={result.totalIncome} />
                <ResultRow label="Adjusted Gross Income (AGI)" value={result.adjustedGrossIncome} />
                <div className="my-4 border-t border-border/60" />
                <ResultRow label="Deductions Used" value={result.standardOrItemizedDeduction} />
                <ResultRow label="Taxable Income" value={result.taxableIncome} highlighted />
                <div className="my-4 border-t border-border/60" />
                <ResultRow label="Estimated Total Tax" value={result.estimatedTax} />
                <ResultRow label="Total Credits" value={result.totalCredits} isCredit />
                <div className="my-4 border-t border-border/60" />
                
                <div className="flex justify-between items-center py-3 px-4 bg-muted/30 rounded-xl">
                  <span className="font-bold text-foreground">Total Taxes Withheld</span>
                  <span className="font-mono font-medium text-foreground">
                    ${defaultValues.taxesWithheld.toLocaleString() /* Simplification: passing back original value not in schema usually, but we have it in form state */}
                  </span>
                </div>
              </div>

              <div className="mt-10 flex justify-end">
                <Button onClick={restart} variant="outline" className="gap-2">
                  <RefreshCcw className="w-4 h-4" /> Start Over
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </Layout>
    );
  }

  // ----------------------------------------------------------------------
  // Wizard Form View
  // ----------------------------------------------------------------------
  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex justify-between mb-3">
            {["Basic Info", "Income", "Deductions", "Credits"].map((label, i) => (
              <div 
                key={label} 
                className={cn(
                  "text-xs font-bold uppercase tracking-wider transition-colors",
                  step > i ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </div>
            ))}
          </div>
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: `${((step - 1) / totalSteps) * 100}%` }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ ease: "easeInOut", duration: 0.3 }}
            />
          </div>
        </div>

        {/* Form Container */}
        <div className="glass-card rounded-3xl p-6 sm:p-10">
          <form onSubmit={handleSubmit(onSubmit)}>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* STEP 1: Basic Info */}
                {step === 1 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl font-display font-bold mb-2">Let's start with the basics</h2>
                      <p className="text-muted-foreground">This helps us determine your standard deduction and eligibility.</p>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <Label>Filing Status</Label>
                        <Controller
                          name="filingStatus"
                          control={control}
                          render={({ field }) => (
                            <RadioCardGroup 
                              value={field.value} 
                              onChange={field.onChange}
                              options={[
                                { label: "Single", value: "Single" },
                                { label: "Married Jointly", value: "Married Filing Jointly" },
                                { label: "Head of Household", value: "Head of Household" },
                              ]}
                            />
                          )}
                        />
                        {errors.filingStatus && <p className="text-sm text-destructive mt-2">{errors.filingStatus.message}</p>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="age">Your Age</Label>
                          <Input 
                            id="age" 
                            type="number" 
                            {...register("age")} 
                            error={errors.age?.message} 
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border/50">
                        <h3 className="font-semibold text-lg mb-4">Dependents</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <div>
                            <Label htmlFor="depsUnder17">Under 17</Label>
                            <Input id="depsUnder17" type="number" {...register("dependentsUnder17")} />
                          </div>
                          <div>
                            <Label htmlFor="depsInSchool">In College (17-23)</Label>
                            <Input id="depsInSchool" type="number" {...register("dependentsInSchool")} />
                          </div>
                          <div>
                            <Label htmlFor="otherDeps">Other Relatives</Label>
                            <Input id="otherDeps" type="number" {...register("otherDependents")} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Income */}
                {step === 2 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl font-display font-bold mb-2">Income & Wages</h2>
                      <p className="text-muted-foreground">Enter your gross earnings before any taxes were taken out.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="sm:col-span-2">
                        <Label htmlFor="wages">Wages (W-2)</Label>
                        <MoneyInput id="wages" {...register("wages")} />
                      </div>
                      
                      {showSpouseFields && (
                        <div className="sm:col-span-2">
                          <Label htmlFor="spouseWages">Spouse's Wages (W-2)</Label>
                          <MoneyInput id="spouseWages" {...register("spouseWages")} />
                        </div>
                      )}

                      <div className="sm:col-span-2">
                        <Label htmlFor="taxesWithheld">Federal Taxes Already Withheld</Label>
                        <p className="text-xs text-muted-foreground mb-2">Check box 2 on your W-2.</p>
                        <MoneyInput id="taxesWithheld" {...register("taxesWithheld")} />
                      </div>

                      <div className="col-span-1 pt-4 border-t border-border/50 sm:col-span-2">
                        <h3 className="font-semibold text-lg mb-4">Other Income Sources</h3>
                      </div>

                      <div>
                        <Label htmlFor="businessIncome">Business/Freelance (1099)</Label>
                        <MoneyInput id="businessIncome" {...register("businessIncome")} />
                      </div>
                      <div>
                        <Label htmlFor="interestIncome">Interest Income</Label>
                        <MoneyInput id="interestIncome" {...register("interestIncome")} />
                      </div>
                      <div>
                        <Label htmlFor="dividendIncome">Dividends</Label>
                        <MoneyInput id="dividendIncome" {...register("dividendIncome")} />
                      </div>
                      <div>
                        <Label htmlFor="capitalGains">Capital Gains (Stock/Crypto)</Label>
                        <MoneyInput id="capitalGains" {...register("capitalGains")} />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Deductions */}
                {step === 3 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl font-display font-bold mb-2">Common Deductions</h2>
                      <p className="text-muted-foreground">We'll automatically choose between these and the standard deduction to give you the best result.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="iraContributions">Traditional IRA Contributions</Label>
                        <MoneyInput id="iraContributions" {...register("iraContributions")} />
                      </div>
                      <div>
                        <Label htmlFor="studentLoanInterest">Student Loan Interest</Label>
                        <MoneyInput id="studentLoanInterest" {...register("studentLoanInterest")} />
                      </div>
                      <div>
                        <Label htmlFor="mortgageInterest">Mortgage Interest</Label>
                        <MoneyInput id="mortgageInterest" {...register("mortgageInterest")} />
                      </div>
                      <div>
                        <Label htmlFor="stateLocalTaxes">State & Local Taxes (SALT)</Label>
                        <MoneyInput id="stateLocalTaxes" {...register("stateLocalTaxes")} />
                      </div>
                      <div>
                        <Label htmlFor="medicalExpenses">Medical Expenses (Out of pocket)</Label>
                        <MoneyInput id="medicalExpenses" {...register("medicalExpenses")} />
                      </div>
                      <div>
                        <Label htmlFor="charitableContributions">Charitable Donations</Label>
                        <MoneyInput id="charitableContributions" {...register("charitableContributions")} />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Credits */}
                {step === 4 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl font-display font-bold mb-2">Tax Credits</h2>
                      <p className="text-muted-foreground">Credits directly reduce the amount of tax you owe dollar-for-dollar.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="childcareExpenses">Child & Dependent Care Expenses</Label>
                        <MoneyInput id="childcareExpenses" {...register("childcareExpenses")} />
                      </div>
                      <div>
                        <Label htmlFor="educationExpenses">College Tuition Paid</Label>
                        <MoneyInput id="educationExpenses" {...register("educationExpenses")} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="energyImprovements">Home Energy Improvements (Solar, etc.)</Label>
                        <MoneyInput id="energyImprovements" {...register("energyImprovements")} />
                      </div>
                    </div>
                    
                    {calculateMutation.isError && (
                      <div className="p-4 bg-destructive/10 text-destructive rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">
                          {calculateMutation.error instanceof Error ? calculateMutation.error.message : "An error occurred while calculating."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Actions */}
            <div className="mt-10 pt-6 border-t border-border flex items-center justify-between">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={prevStep}
                disabled={step === 1 || calculateMutation.isPending}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              
              <Button 
                type="submit" 
                className="gap-2"
                isLoading={calculateMutation.isPending}
              >
                {step === totalSteps ? "Calculate My Taxes" : "Continue"}
                {step !== totalSteps && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>

          </form>
        </div>
      </div>
    </Layout>
  );
}

// ----------------------------------------------------------------------
// Helper Component for Results
// ----------------------------------------------------------------------
function ResultRow({ 
  label, 
  value, 
  highlighted = false,
  isCredit = false
}: { 
  label: string; 
  value: number; 
  highlighted?: boolean;
  isCredit?: boolean;
}) {
  return (
    <div className={cn(
      "flex justify-between items-center py-2",
      highlighted && "bg-primary/5 -mx-4 px-4 py-3 rounded-lg"
    )}>
      <span className={cn("text-muted-foreground", highlighted && "font-semibold text-primary")}>
        {label}
      </span>
      <span className={cn(
        "font-mono font-medium",
        highlighted && "font-bold text-primary",
        isCredit && "text-green-600"
      )}>
        {isCredit ? "-" : ""}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}
