import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SplitCalculator = () => {
  const [total, setTotal] = useState("14.00");
  const [cardA, setCardA] = useState("8.40");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const totalNum = parseFloat(total) || 0;
  const cardANum = Math.min(parseFloat(cardA) || 0, totalNum);
  const cardBNum = Math.max(0, +(totalNum - cardANum).toFixed(2));
  const cardAPercent = totalNum > 0 ? (cardANum / totalNum) * 100 : 60;

  const handleCalculate = async () => {
    if (totalNum <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Split ready ✅", description: `Chase gets $${cardANum.toFixed(2)}, Citi gets $${cardBNum.toFixed(2)}` });
    }, 800);
  };

  return (
    <section id="split-calculator" className="relative py-32">
      <div className="pointer-events-none absolute right-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-[150px]" />

      <div className="container relative mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Try It Now
          </p>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            See Your Split in Action
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Enter any amount and drag to split it across two cards exactly how you want.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-lg"
        >
          <div className="glass rounded-2xl p-8 glow-primary">
            <div className="mb-8">
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Order Total
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={total}
                  onChange={(e) => {
                    setTotal(e.target.value);
                    const newTotal = parseFloat(e.target.value) || 0;
                    if (cardANum > newTotal) setCardA(e.target.value);
                  }}
                  className="w-full rounded-xl border border-border bg-secondary/50 py-4 pl-11 pr-4 font-display text-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>Drag to adjust split</span>
                <span className="text-primary">{Math.round(cardAPercent)}% / {Math.round(100 - cardAPercent)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max={totalNum}
                step="0.01"
                value={cardANum}
                onChange={(e) => setCardA(e.target.value)}
                className="w-full accent-primary"
              />
              <div className="mt-2 flex h-3 overflow-hidden rounded-full">
                <div className="bg-primary transition-all duration-200" style={{ width: `${cardAPercent}%` }} />
                <div className="bg-accent transition-all duration-200" style={{ width: `${100 - cardAPercent}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                <div className="mb-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Chase
                </div>
                <p className="font-display text-3xl font-bold text-primary">
                  ${cardANum.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-primary/70">{Math.round(cardAPercent)}% of total</p>
              </div>

              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-center">
                <div className="mb-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4 text-accent" />
                  Citi
                </div>
                <p className="font-display text-3xl font-bold text-accent">
                  ${cardBNum.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-accent/70">{Math.round(100 - cardAPercent)}% of total</p>
              </div>
            </div>

            <Button
              size="lg"
              className="mt-6 w-full gap-2 text-base"
              onClick={handleCalculate}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Calculating...</>
              ) : (
                "Calculate Split"
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SplitCalculator;
