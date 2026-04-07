import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import CalculatorForm from "./pages/CalculatorForm";
import RecentCalculations from "./pages/RecentCalculations";

function Router() {
  return (
    <Switch>
      <Route path="/" component={CalculatorForm} />
      <Route path="/embed" component={CalculatorForm} />
      <Route path="/recent" component={RecentCalculations} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
