import { motion } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

const rows = [
  { feature: "Split Payments", kasheesh: true, paysplit: true },
  { feature: "AI Card Recommendations", kasheesh: false, paysplit: true },
  { feature: "ML Fraud Detection", kasheesh: false, paysplit: true },
  { feature: "Spending Forecasting", kasheesh: false, paysplit: true },
  { feature: "Browser Extension", kasheesh: true, paysplit: true },
  { feature: "Transaction Fee", kasheesh: "2%", paysplit: "0.5%" },
  { feature: "Native Checkout Integration", kasheesh: "partial", paysplit: true },
  { feature: "Open Source ML Models", kasheesh: false, paysplit: true },
];

const renderValue = (val: boolean | string) => {
  if (val === true) return <Check className="mx-auto h-5 w-5 text-primary" />;
  if (val === false) return <X className="mx-auto h-5 w-5 text-destructive/60" />;
  if (val === "partial") return <Minus className="mx-auto h-5 w-5 text-muted-foreground" />;
  return <span className="font-display font-semibold">{val}</span>;
};

const ComparisonTable = () => {
  return (
    <section id="compare" className="relative py-32">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Why Switch?
          </p>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            PaySplit vs Kasheesh
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl overflow-hidden rounded-2xl glass"
        >
          <div className="grid grid-cols-3 border-b border-border px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="text-left">Feature</span>
            <span>Kasheesh</span>
            <span className="text-primary">PaySplit AI</span>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.feature}
              className={`grid grid-cols-3 items-center px-6 py-4 text-center text-sm ${
                i < rows.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              <span className="text-left font-medium text-foreground">{r.feature}</span>
              <span>{renderValue(r.kasheesh)}</span>
              <span>{renderValue(r.paysplit)}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ComparisonTable;
