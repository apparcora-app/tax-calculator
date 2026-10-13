import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trash2, Download, FileText, CheckCircle2 } from "lucide-react";
import type { TaxCalculationRecord } from "@shared/schema";

export default function RecentCalculations() {
  const [history, setHistory] = useState<TaxCalculationRecord[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tax_calculator_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      setHistory([]);
    }
  }, []);

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your calculation history?")) {
      localStorage.removeItem("tax_calculator_history");
      setHistory([]);
    }
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tax_history_2025_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" className="gap-2 text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" /> Back to Calculator
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={exportJSON} className="gap-2">
                  <Download className="w-4 h-4" /> Export JSON
                </Button>
                <Button variant="destructive" size="sm" onClick={clearHistory} className="gap-2">
                  <Trash2 className="w-4 h-4" /> Clear
                </Button>
              </>
            )}
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-400" /> Calculation History
            </CardTitle>
            <CardDescription className="text-slate-400">
              100% Client-Side & Private. All calculation snapshots are saved locally in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-lg">No calculation snapshots found.</p>
                <p className="text-sm">Run a tax calculation scenario to record an audit snapshot locally.</p>
                <Link href="/">
                  <Button className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white">Start New Calculation</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{item.filingStatus}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{item.state}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        AGI: {formatCurrency(item.results?.adjustedGrossIncome || 0)} · Taxable Income:{" "}
                        {formatCurrency(item.results?.taxableIncome || 0)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-400">Net Balance</div>
                      <div
                        className={`text-lg font-bold ${
                          (item.results?.refundOrOwe || 0) >= 0 ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {(item.results?.refundOrOwe || 0) >= 0
                          ? `Refund: ${formatCurrency(item.results?.refundOrOwe || 0)}`
                          : `Owe: ${formatCurrency(Math.abs(item.results?.refundOrOwe || 0))}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
