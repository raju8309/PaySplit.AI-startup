import { motion } from "framer-motion";
import { ArrowRight, Shield, Chrome, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-cards.png";

const HeroSection = () => {
  const handleAddToChrome = () => {
    // Replace with your real Chrome Web Store URL when published
    window.open("https://chrome.google.com/webstore", "_blank");
  };

  const handleWatchDemo = () => {
    // Scrolls down to the split calculator section
    document.getElementById("split-calculator")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen overflow-hidden pt-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[120px] animate-pulse-glow" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[120px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="container relative mx-auto px-6">
        <div className="grid min-h-[80vh] items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex flex-col gap-8"
          >
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Chrome className="h-4 w-4" />
              Chrome Extension · Works at Checkout
            </div>

            <h1 className="font-display text-5xl font-bold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
              Pay with{" "}
              <span className="text-gradient-primary">multiple cards.</span>{" "}
              Anywhere.
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
              $14 DoorDash order but only $12 on one card? PaySplit lets you
              split any online checkout across multiple cards — right from the
              payment page. A smarter Chrome extension, powered by AI.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="group gap-2 text-base" onClick={handleAddToChrome}>
                Add to Chrome — It's Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="outline" size="lg" className="text-base" onClick={handleWatchDemo}>
                Watch Demo
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                PCI DSS Compliant
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Works on DoorDash, Uber Eats, Amazon & 500+ sites
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="relative flex items-center justify-center"
          >
            <div className="relative">
              <img
                src={heroImage}
                alt="PaySplit AI - Split checkout payments across multiple cards"
                className="w-full max-w-xl rounded-2xl"
              />
              <motion.div
                animate={{ y: [-8, 8, -8] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-8 top-1/4 glass rounded-xl px-4 py-3 glow-primary"
              >
                <p className="text-xs text-muted-foreground">Card A</p>
                <p className="font-display text-xl font-bold text-primary">$12.00</p>
              </motion.div>
              <motion.div
                animate={{ y: [8, -8, 8] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-4 bottom-1/3 glass rounded-xl px-4 py-3 glow-accent"
              >
                <p className="text-xs text-muted-foreground">Card B</p>
                <p className="font-display text-xl font-bold text-accent">$2.00</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;