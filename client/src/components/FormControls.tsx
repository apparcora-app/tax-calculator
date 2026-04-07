import { forwardRef } from "react";
import { DollarSign } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ----------------------------------------------------------------------
// Base Label
// ----------------------------------------------------------------------
export const Label = forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("block text-sm font-semibold text-foreground mb-2", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";

// ----------------------------------------------------------------------
// Money Input (with $ prefix)
// ----------------------------------------------------------------------
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const MoneyInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
        <input
          ref={ref}
          type="number"
          className={cn(
            "w-full pl-10 pr-4 py-3 rounded-xl",
            "bg-white border-2 transition-all duration-200",
            "text-foreground text-base placeholder:text-muted-foreground",
            error 
              ? "border-destructive focus:border-destructive focus:ring-4 focus:ring-destructive/10" 
              : "border-border focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-border/80",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-destructive font-medium">{error}</p>}
      </div>
    );
  }
);
MoneyInput.displayName = "MoneyInput";

// ----------------------------------------------------------------------
// Standard Input
// ----------------------------------------------------------------------
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-3 rounded-xl",
            "bg-white border-2 transition-all duration-200",
            "text-foreground text-base placeholder:text-muted-foreground",
            error 
              ? "border-destructive focus:border-destructive focus:ring-4 focus:ring-destructive/10" 
              : "border-border focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-border/80",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-destructive font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// ----------------------------------------------------------------------
// Premium Button
// ----------------------------------------------------------------------
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: "border-2 border-border bg-transparent hover:border-foreground hover:bg-muted/50 text-foreground",
      ghost: "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 ease-out",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none",
          variants[variant],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

// ----------------------------------------------------------------------
// Radio Card Group
// ----------------------------------------------------------------------
export function RadioCardGroup({ 
  options, 
  value, 
  onChange 
}: { 
  options: { label: string; value: string; description?: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
            value === opt.value
              ? "border-primary bg-primary/5 ring-4 ring-primary/10"
              : "border-border bg-white hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <input
            type="radio"
            name="radio-group"
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          <div className="flex items-center justify-between mb-1">
            <span className={cn(
              "font-semibold text-base",
              value === opt.value ? "text-primary" : "text-foreground"
            )}>
              {opt.label}
            </span>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
              value === opt.value ? "border-primary" : "border-muted-foreground/30"
            )}>
              {value === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
          </div>
          {opt.description && (
            <span className="text-sm text-muted-foreground mt-1">
              {opt.description}
            </span>
          )}
        </label>
      ))}
    </div>
  );
}
// ----------------------------------------------------------------------
// Styled Select
// ----------------------------------------------------------------------
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            "w-full px-4 py-3 rounded-xl appearance-none",
            "bg-white border-2 transition-all duration-200",
            "text-foreground text-base",
            "focus:outline-none",
            error 
              ? "border-destructive focus:border-destructive focus:ring-4 focus:ring-destructive/10" 
              : "border-border focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-border/80",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {error && <p className="mt-1.5 text-sm text-destructive font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
