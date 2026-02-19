import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="relative py-32">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl glass glow-primary p-12 text-center md:p-16"
        >
          {/* Glow orbs */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-primary/20 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-accent/20 blur-[80px]" />

          <div className="relative">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-display text-4xl font-bold md:text-5xl">
              Never Get Declined<br />at Checkout Again
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Low balance on one card? Spread the charge across two or more.
              PaySplit sits right in the checkout page — DoorDash, Uber Eats,
              Amazon, and 500+ sites. Install once, split everywhere.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button size="lg" className="group gap-2 text-base">
                Add to Chrome — Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="outline" size="lg" className="text-base">
                See How It Works
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Works everywhere you pay online. No sign-up fee, no credit check.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
