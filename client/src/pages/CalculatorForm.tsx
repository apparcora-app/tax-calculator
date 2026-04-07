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
  RefreshCcw,
  Download,
  Info
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { useCalculateTax } from "@/hooks/use-tax";
import { Layout } from "@/components/Layout";
import { Label, Input, MoneyInput, Button, RadioCardGroup, Select } from "@/components/FormControls";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------
// Frontend Form Schema (with aggressive coercion for string HTML inputs)
// ----------------------------------------------------------------------
const formSchema = z.object({
  // Basic Info
  taxYear: z.coerce.number().default(2025),
  filingStatus: z.string().min(1, "Please select a filing status"),
  state: z.string().default("Other"),
  age: z.coerce.number().min(1, "Age is required").max(120, "Invalid age"),
  dependentsUnder17: z.coerce.number().default(0),
  dependentsInSchool: z.coerce.number().default(0),
  otherDependents: z.coerce.number().default(0),

  // Income
  wages: z.coerce.number().default(0),
  spouseWages: z.coerce.number().default(0),
  businessIncome: z.coerce.number().default(0),
  businessExpenses: z.coerce.number().default(0),
  taxesWithheld: z.coerce.number().default(0),
  interestIncome: z.coerce.number().default(0),
  dividendIncome: z.coerce.number().default(0),
  qualifiedDividends: z.coerce.number().default(0),
  capitalGains: z.coerce.number().default(0),
  longTermCapitalGains: z.coerce.number().default(0),
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
  state: "Other",
  age: 30,
  dependentsUnder17: 0,
  dependentsInSchool: 0,
  otherDependents: 0,
  wages: 0,
  spouseWages: 0,
  businessIncome: 0,
  businessExpenses: 0,
  taxesWithheld: 0,
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
      { name: 'Fed Tax', value: result.estimatedTax, color: 'hsl(var(--primary))' },
      { name: 'State Tax', value: result.stateIncomeTax, color: 'hsl(var(--secondary))' },
      { name: 'SE Tax', value: result.selfEmploymentTax, color: '#f59e0b' },
      { name: 'Deductions', value: result.standardOrItemizedDeduction, color: 'hsl(var(--muted-foreground)/0.4)' },
    ].filter(d => d.value > 0);

    const handleDownloadPDF = async () => {
      const element = document.getElementById('tax-report');
      if (!element) return;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Tax_Estimate_2025.pdf`);
    };

    return (
      <Layout>
        <div id="tax-report">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto p-4 sm:p-0"
          >
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center p-3 bg-primary/5 rounded-2xl mb-4">
                <PieChartIcon className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl font-display font-extrabold text-foreground">
                Your Tax Summary | 2025
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Based on the top-tier 2025 fiscal projections, here is your estimated scenario for Federal, State, and Self-Employment taxes.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Highlight Card */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="glass-card rounded-3xl p-8 text-center relative overflow-hidden bg-white/50 backdrop-blur-xl border border-white/20 shadow-2xl shadow-primary/5">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                  
                  <h2 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-2">
                    ESTIMATED {isRefund ? "REFUND" : "AMOUNT OWED"}
                  </h2>
                  
                  <div className={`text-5xl font-display font-extrabold tracking-tight mb-2 ${
                    isRefund ? "text-green-600" : "text-destructive"
                  }`}>
                    ${absAmount.toLocaleString()}
                  </div>
                  
                  <div className={cn(
                    "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full mt-2",
                    isRefund ? "bg-green-100 text-green-800" : "bg-destructive/10 text-destructive"
                  )}>
                    {isRefund ? (
                      <><CheckCircle2 className="w-4 h-4" /> Great news!</>
                    ) : (
                      <><AlertCircle className="w-4 h-4" /> Plan accordingly</>
                    )}
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-6 bg-white/50 backdrop-blur-xl border border-white/20 shadow-xl shadow-primary/5">
                  <h3 className="font-display font-bold mb-4">Liability Breakdown</h3>
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
                  <div className="flex flex-wrap justify-center gap-3 mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {chartData.map(d => (
                      <span key={d.name} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown List */}
              <div className="lg:col-span-2 glass-card rounded-3xl p-8 bg-white/50 backdrop-blur-xl border border-white/20 shadow-2xl shadow-primary/5">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-display text-2xl font-bold">Detailed Summary</h3>
                  <Button onClick={handleDownloadPDF} variant="outline" className="gap-2 h-10 py-0 text-sm">
                    <Download className="w-4 h-4" /> Export PDF
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <ResultRow label="Total Gross Income" value={result.totalIncome} />
                  <ResultRow label="Adjusted Gross Income (AGI)" value={result.adjustedGrossIncome} />
                  <div className="my-4 border-t border-border/40" />
                  
                  <ResultRow label="Standard/Itemized Deduction" value={result.standardOrItemizedDeduction} />
                  <ResultRow label="Taxable Income" value={result.taxableIncome} highlighted />
                  <div className="my-4 border-t border-border/40" />
                  
                  <div className="space-y-2 mb-6">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Tax Liability Breakout</h4>
                    <ResultRow label="Federal Income Tax" value={result.estimatedTax} />
                    <ResultRow label="Self-Employment Tax" value={result.selfEmploymentTax} />
                    <ResultRow label="Estimated State Tax" value={result.stateIncomeTax} />
                    <ResultRow label="Total Tax Credits Applied" value={result.totalCredits} isCredit />
                  </div>
                  
                  <div className="pt-4 border-t-2 border-primary/20">
                    <div className="flex justify-between items-center py-4 px-5 bg-primary/5 rounded-2xl border border-primary/10">
                      <div>
                        <span className="block font-bold text-primary text-lg">Total Taxes Owed</span>
                        <span className="text-xs text-primary/60 font-medium">Sum of all liabilities after credits</span>
                      </div>
                      <span className="text-2xl font-display font-extrabold text-primary">
                        ${(result.estimatedTax + result.selfEmploymentTax + result.stateIncomeTax - result.totalCredits).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-4 flex-wrap">
                  <Button onClick={restart} variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                    <RefreshCcw className="w-4 h-4" /> Start New Calculation
                  </Button>
                </div>
                
                <div className="mt-8 pt-6 border-t border-border/40 flex items-start gap-3">
                  <Info className="w-4 h-4 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground/60 leading-relaxed italic">
                    Disclaimer: This tool provides estimates only based on projected 2025 tax laws. It does not constitute official tax advice. Actual tax liability depends on various individual factors and finalized IRS documentation. Always consult with a qualified tax professional.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
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
                                { label: "Married Separately", value: "Married Filing Separately" },
                                { label: "Head of Household", value: "Head of Household" },
                                { label: "Qualifying Surviving Spouse", value: "Qualifying Surviving Spouse" },
                              ]}
                            />
                          )}
                        />
                        {errors.filingStatus && <p className="text-sm text-destructive mt-2">{errors.filingStatus.message}</p>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="state">Residency State</Label>
                          <Select id="state" {...register("state")} error={errors.state?.message}>
                            <option value="Other">Other / No Income Tax State</option>
                            <option value="California">California</option>
                            <option value="New York">New York</option>
                            <option value="Illinois">Illinois</option>
                            <option value="Texas">Texas</option>
                            <option value="Florida">Florida</option>
                          </Select>
                        </div>
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

                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                        <div className="sm:col-span-2">
                          <h3 className="font-semibold text-lg mb-2">Self-Employment / Business</h3>
                          <p className="text-xs text-muted-foreground mb-4">Calculate net profit for 1099 and freelance income.</p>
                        </div>
                        <div>
                          <Label htmlFor="businessIncome">Gross Business Income</Label>
                          <MoneyInput id="businessIncome" {...register("businessIncome")} />
                        </div>
                        <div>
                          <Label htmlFor="businessExpenses">Business Expenses</Label>
                          <MoneyInput id="businessExpenses" {...register("businessExpenses")} />
                        </div>
                      </div>

                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                        <div className="sm:col-span-2">
                          <h3 className="font-semibold text-lg mb-2">Investments & Gains</h3>
                        </div>
                        <div>
                          <Label htmlFor="interestIncome">Interest Income</Label>
                          <MoneyInput id="interestIncome" {...register("interestIncome")} />
                        </div>
                        <div>
                          <Label htmlFor="dividendIncome">Total Dividends</Label>
                          <MoneyInput id="dividendIncome" {...register("dividendIncome")} />
                        </div>
                        <div>
                          <Label htmlFor="qualifiedDividends">Qualified Dividends</Label>
                          <MoneyInput id="qualifiedDividends" {...register("qualifiedDividends")} />
                        </div>
                        <div>
                          <Label htmlFor="capitalGains">Short-Term Cap. Gains</Label>
                          <MoneyInput id="capitalGains" {...register("capitalGains")} />
                        </div>
                        <div>
                          <Label htmlFor="longTermCapitalGains">Long-Term Cap. Gains</Label>
                          <MoneyInput id="longTermCapitalGains" {...register("longTermCapitalGains")} />
                        </div>
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
