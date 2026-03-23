import { motion } from "framer-motion";
import { Brain, Shield, SplitSquareVertical, Sparkles } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Real-Time Fraud Detection",
    description: "Every transaction is scored for fraud risk before it goes through. Unusual patterns are flagged instantly so your money stays safe.",
    tag: "Live",
    color: "primary" as const,
  },
  {
    icon: Brain,
    title: "Smart Card Allocation",
    description: "Tell us your cards and we figure out the best way to split the charge. The more you use PaySplit, the smarter it gets.",
    tag: "ML Powered",
    color: "accent" as const,
  },
  {
    icon: SplitSquareVertical,
    title: "Automatic Split Engine",
    description: "When you pay with your PaySplit card, the backend automatically charges each of your real cards their exact portion. No manual steps.",
    tag: "Core Feature",
    color: "primary" as const,
  },
  {
    icon: Sparkles,
    title: "Works Everywhere Online",
    description: "DoorDash, Amazon, Uber Eats — anywhere that accepts a Visa or Mastercard online accepts your PaySplit card. No special integration needed.",
    tag: "Universal",
    color: "accent" as const,
  },
];

const AIFeatures = () => {
  return (
    <section id="ai-features" className="relative py-32">
      <div className="pointer-events-none absolute left-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-primary/5 blur-[150px]" />
      <div className="container relative mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Built to Be Smart
          </p>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            More Than Just a Card
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            PaySplit handles the complexity behind the scenes — fraud detection, split logic, and card routing — so you never have to think about it.
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
