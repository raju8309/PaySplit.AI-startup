import { motion } from "framer-motion";
import { CreditCard, Link, SplitSquareVertical, Zap } from "lucide-react";

const steps = [
  {
    icon: CreditCard,
    title: "Get Your PaySplit Card",
    description: "Sign up and get a PaySplit virtual card instantly. It works anywhere online — DoorDash, Amazon, Uber, you name it.",
    step: "01",
  },
  {
    icon: Link,
    title: "Link Your Real Cards",
    description: "Connect your existing cards inside the PaySplit app. Your Chase card, your Citi card, whatever you have.",
    step: "02",
  },
  {
    icon: SplitSquareVertical,
    title: "Set Your Split",
    description: "Before you pay, choose how the charge splits. 60% on Chase, 40% on Citi. You decide the percentage for each card.",
    step: "03",
  },
  {
    icon: Zap,
    title: "Pay and We Handle the Rest",
    description: "Checkout with your PaySplit card like normal. We automatically charge each of your real cards their portion in the background.",
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
            How It Works
          </p>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            One Card. Your Rules.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            No more picking one card and hoping it has enough balance. Set your split once and pay with confidence every time.
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
