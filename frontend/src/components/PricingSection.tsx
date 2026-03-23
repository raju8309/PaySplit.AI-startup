import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with no commitment",
    features: [
      "One PaySplit virtual card",
      "Up to 10 splits per month",
      "Link up to 2 real cards",
      "Fraud detection on every transaction",
      "Bank-level encryption",
    ],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$4.99",
    period: "per month",
    description: "For people who split every purchase",
    features: [
      "Everything in Free",
      "Unlimited splits",
      "Link unlimited cards",
      "Custom split percentages per merchant",
      "Priority support",
    ],
    cta: "Get Started",
    highlight: true,
  },
];

const PricingSection = () => {
  const handleCTA = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  return (
    <section id="pricing" className="relative py-32">
      <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-accent/5 blur-[150px]" />

      <div className="container relative mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Simple Pricing
          </p>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            Start Free. Upgrade When You Need To.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            No hidden fees. No per-transaction charges. Just a flat monthly plan when you're ready.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-2">
          {tiers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`relative flex flex-col rounded-2xl p-8 ${
                t.highlight ? "glass glow-primary gradient-border" : "glass"
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                  Most Popular
                </span>
              )}
              <h3 className="font-display text-lg font-semibold">{t.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">{t.price}</span>
                <span className="text-sm text-muted-foreground">/{t.period}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>

              <ul className="mt-8 flex flex-1 flex-col gap-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-8 gap-2"
                variant={t.highlight ? "default" : "outline"}
                size="lg"
                onClick={handleCTA}
              >
                {t.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
