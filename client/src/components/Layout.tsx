import { Link, useLocation } from "wouter";
import { Calculator, Calculator as CalcIcon } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [pathname] = useLocation();
  const navItems = [
    { href: "/", label: "Estimator", icon: CalcIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-white/80 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                <Calculator className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg tracking-tight">
                Free Income Tax Calculator<span className="text-primary/60">.</span>
              </span>
            </div>

            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/5 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden sm:inline-block">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-border/50 bg-white py-8 mt-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
            <p>This is a simplified estimator and does not replace professional tax advice.</p>
            <p className="mt-2">© {new Date().getFullYear()} Free Income Tax Calculator.</p>
          </div>
      </footer>
    </div>
  );
}
