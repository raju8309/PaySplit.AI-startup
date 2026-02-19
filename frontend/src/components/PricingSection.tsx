import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try PaySplit risk-free",
    features: [
      "Split across 2 cards",
      "5 transactions/month",
      "Basic card recommendation",
      "Bank-level encryption",
    ],
    cta: "Get Started Free",
    highlight: false,
    action: "waitlist",
  },
  {
    name: "Pro",
    price: "0.5%",
    period: "per transaction",
    description: "For power users who maximize rewards",
    features: [
      "Unlimited cards",
      "Unlimited transactions",
      "AI smart recommendations",
      "Fraud detection",
      "Spending forecaster",
      "Priority support",
      "Browser extension",
    ],
    cta: "Start Pro Trial",
    highlight: true,
    action: "waitlist",
  },
  {
    name: "Business",
    price: "Custom",
    period: "volume pricing",
    description: "For teams and enterprises",
    features: [
      "Everything in Pro",
      "Team management",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    highlight: false,
    action: "contact",
  },
];

const PricingSection = () => {
  const handleCTA = (action: string) => {
    if (action === "waitlist") {
      // Scroll to waitlist form at the bottom
      document.querySelector(".waitlist-section")?.scrollIntoView({ behavior: "smooth" });
      // Fallback: scroll to bottom of page
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } else if (action === "contact") {
      window.location.href = "mailto:hello@paysplit.ai?subject=Business Plan Inquiry";
    }
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
            Pay Less Per Split
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Just 0.5% per transaction. That's $0.50 on a $100 order — less than a candy bar.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
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
                onClick={() => handleCTA(t.action)}
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