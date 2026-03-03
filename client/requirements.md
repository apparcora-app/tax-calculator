## Packages
framer-motion | Smooth transitions between wizard steps and premium animations
recharts | Beautiful data visualization for the tax breakdown results
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility to merge tailwind classes safely

## Notes
- `framer-motion` is used to create a polished, "native app" feel when navigating between form steps.
- `recharts` is used on the final results page to display a visual breakdown of income, deductions, and taxes.
- Form inputs that expect numeric values use `z.coerce.number()` in the frontend schema to safely parse HTML string inputs before sending them to the strictly typed backend schema.
