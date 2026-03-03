import { Layout } from "@/components/Layout";
import { useRecentCalculations } from "@/hooks/use-tax";
import { FileText, Calendar, DollarSign, Clock, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function RecentCalculations() {
  const { data: calculations, isLoading, isError } = useRecentCalculations();

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-extrabold text-foreground mb-2">
              Calculation History
            </h1>
            <p className="text-muted-foreground text-lg">
              Review your previous tax estimates.
            </p>
          </div>
          <Link 
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors gap-2"
          >
            New Estimate <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-6 h-48 animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-20 glass-card rounded-3xl">
            <p className="text-destructive font-semibold">Failed to load history.</p>
          </div>
        ) : !calculations || calculations.length === 0 ? (
          <div className="text-center py-24 glass-card rounded-3xl border-dashed">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">No calculations yet</h3>
            <p className="text-muted-foreground mb-6">Create your first tax estimate to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calculations.map((calc) => {
              const isRefund = calc.refundOrOwe > 0;
              const absAmount = Math.abs(calc.refundOrOwe);
              const date = calc.createdAt ? new Date(calc.createdAt).toLocaleDateString() : 'Unknown date';

              return (
                <div 
                  key={calc.id} 
                  className="glass-card rounded-2xl p-6 flex flex-col hover:shadow-xl hover:border-primary/20 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5" />
                      {calc.taxYear}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {date}
                    </span>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                      {calc.filingStatus}
                    </h4>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-medium text-muted-foreground">AGI:</span>
                      <span className="font-mono font-bold text-foreground">
                        ${calc.adjustedGrossIncome.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/50">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      {isRefund ? "Estimated Refund" : "Amount Owed"}
                    </p>
                    <div className={`text-2xl font-display font-extrabold ${isRefund ? "text-green-600" : "text-destructive"}`}>
                      ${absAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
