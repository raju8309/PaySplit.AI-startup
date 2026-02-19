import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Sparkles, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SplitCalculator = () => {
  const [total, setTotal] = useState("14.00");
  const [cardA, setCardA] = useState("12.00");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ balances_cents: Record<string, number>; transactions: { from: string; to: string; amount_cents: number }[] } | null>(null);
  const { toast } = useToast();

  const totalNum = parseFloat(total) || 0;
  const cardANum = parseFloat(cardA) || 0;
  const cardBNum = Math.max(0, +(totalNum - cardANum).toFixed(2));
  const fee = +(totalNum * 0.005).toFixed(2);
  const cardAPercent = totalNum > 0 ? (cardANum / totalNum) * 100 : 50;

  const handleCalculate = async () => {
    if (totalNum <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/settlements/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenses: [
            {
              payer: "Card A",
              amount: totalNum,
              members: ["Card A", "Card B"],
              split_type: "custom",
              splits: [
                { user: "Card A", amount: cardANum },
                { user: "Card B", amount: cardBNum },
              ],
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Calculation failed");

      setResult(data);
      toast({ title: "Split calculated! ✅", description: "Powered by your backend." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
            Enter any amount and drag to split it across two cards. AI optimizes
            for maximum rewards.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-lg"
        >
          <div className="glass rounded-2xl p-8 glow-primary">
            {/* Total input */}
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
                    setResult(null);
                    const newTotal = parseFloat(e.target.value) || 0;
                    if (cardANum > newTotal) setCardA(e.target.value);
                  }}
                  className="w-full rounded-xl border border-border bg-secondary/50 py-4 pl-11 pr-4 font-display text-2xl font-bold text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Split slider */}
            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>Drag to adjust split</span>
                <span className="flex items-center gap-1 text-primary">
                  <Sparkles className="h-3 w-3" /> AI Optimized
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={totalNum}
                step="0.01"
                value={cardANum}
                onChange={(e) => { setCardA(e.target.value); setResult(null); }}
                className="w-full accent-primary"
              />
              <div className="mt-2 flex h-3 overflow-hidden rounded-full">
                <div className="bg-primary transition-all duration-200" style={{ width: `${cardAPercent}%` }} />
                <div className="bg-accent transition-all duration-200" style={{ width: `${100 - cardAPercent}%` }} />
              </div>
            </div>

            {/* Card split display */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                <div className="mb-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Card A
                </div>
                <p className="font-display text-3xl font-bold text-primary">
                  ${cardANum.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-primary/70">3% cashback → ${(cardANum * 0.03).toFixed(2)} back</p>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-center">
                <div className="mb-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4 text-accent" />
                  Card B
                </div>
                <p className="font-display text-3xl font-bold text-accent">
                  ${cardBNum.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-accent/70">2% cashback → ${(cardBNum * 0.02).toFixed(2)} back</p>
              </div>
            </div>

            {/* Fee line */}
            <div className="mt-6 flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3 text-sm">
              <span className="text-muted-foreground">PaySplit fee (0.5%)</span>
              <span className="font-semibold text-foreground">${fee}</span>
            </div>

            {/* Backend result */}
            {result && (
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                <p className="font-semibold text-primary mb-1">✅ Backend Confirmed Split</p>
                {result.transactions.map((tx, i) => (
                  <p key={i} className="text-muted-foreground">
                    {tx.from} → {tx.to}: ${(tx.amount_cents / 100).toFixed(2)}
                  </p>
                ))}
              </div>
            )}

            <Button
              size="lg"
              className="mt-6 w-full gap-2 text-base"
              onClick={handleCalculate}
              disabled={loading}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculating...</> : "Calculate Split"}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SplitCalculator;