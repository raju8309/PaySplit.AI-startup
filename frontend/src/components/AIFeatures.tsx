import { motion } from "framer-motion";
import { Brain, Shield, TrendingUp, Sparkles } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Smart Card Recommendation",
    description: "XGBoost ML model analyzes merchant category, card rewards, and your spending patterns to suggest the perfect card split for maximum cashback.",
    tag: "XGBoost",
    color: "primary" as const,
  },
  {
    icon: Shield,
    title: "Real-Time Fraud Detection",
    description: "Isolation Forest anomaly detection scores every transaction in milliseconds. Unusual patterns trigger 2FA — blocking 99.7% of fraud while approving 99% of legit payments.",
    tag: "Isolation Forest",
    color: "accent" as const,
  },
  {
    icon: TrendingUp,
    title: "Spending Forecaster",
    description: "Prophet time-series model predicts your next 30 days of spending. Get proactive alerts when you're about to exceed limits or miss rewards thresholds.",
    tag: "Prophet",
    color: "primary" as const,
  },
  {
    icon: Sparkles,
    title: "Browser Extension",
    description: "Works natively on DoorDash, Uber Eats, Amazon, and 500+ sites. No extra steps — PaySplit injects seamlessly into every checkout page.",
    tag: "Chrome Extension",
    color: "accent" as const,
  },
];

const AIFeatures = () => {
  return (
    <section id="ai-features" className="relative py-32">
      {/* Glow */}
      <div className="pointer-events-none absolute left-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-primary/5 blur-[150px]" />

      <div className="container relative mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Intelligence Built In
          </p>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            AI That Saves You Money
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Three production ML models work together to optimize every payment,
            detect fraud in real-time, and predict your financial future.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group glass rounded-2xl p-8 transition-all hover:glow-primary"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${f.color === "primary" ? "bg-primary/10" : "bg-accent/10"}`}>
                  <f.icon className={`h-6 w-6 ${f.color === "primary" ? "text-primary" : "text-accent"}`} />
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${f.color === "primary" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                  {f.tag}
                </span>
              </div>
              <h3 className="mb-3 font-display text-xl font-semibold">{f.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AIFeatures;
