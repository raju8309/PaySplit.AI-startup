import { motion } from "framer-motion";
import { Chrome, SplitSquareVertical, ShoppingCart, CreditCard } from "lucide-react";

const steps = [
  {
    icon: Chrome,
    title: "Install the Extension",
    description: "Add PaySplit to Chrome in one click. It runs silently in the background until you hit a checkout page.",
    step: "01",
  },
  {
    icon: ShoppingCart,
    title: "Shop & Checkout Normally",
    description: "Order food on DoorDash, shop on Amazon, book an Uber — when you reach the payment page, PaySplit appears automatically.",
    step: "02",
  },
  {
    icon: SplitSquareVertical,
    title: "Split Across Your Cards",
    description: "Choose how to divide the total across 2–5 cards. Our AI suggests the best split to maximize rewards — or set your own amounts.",
    step: "03",
  },
  {
    icon: CreditCard,
    title: "One-Click Pay",
    description: "Hit pay once. PaySplit charges each card for its portion and completes the checkout seamlessly. No virtual cards, no workarounds.",
    step: "04",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative py-32">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Seamless Checkout Experience
          </p>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            Split Any Online Payment in Seconds
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            PaySplit injects directly into checkout pages. No switching apps, no copy-pasting — just an extra payment option right where you pay.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-4"
        >
          {steps.map((s) => (
            <motion.div
              key={s.step}
              variants={itemVariants}
              className="group relative glass rounded-2xl p-8 transition-all hover:glow-primary"
            >
              <span className="absolute right-6 top-6 font-display text-5xl font-bold text-border/60">
                {s.step}
              </span>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <s.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-3 font-display text-xl font-semibold">{s.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{s.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
