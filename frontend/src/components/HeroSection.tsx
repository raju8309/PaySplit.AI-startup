import { motion } from "framer-motion";
import { ArrowRight, Shield, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  const handleGetStarted = () => {
    window.location.href = "/dashboard";
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
              <CreditCard className="h-4 w-4" />
              One virtual card. Multiple real cards behind it.
            </div>

            <h1 className="font-display text-5xl font-bold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
              One checkout,{" "}
              <span className="text-gradient-primary">many cards.</span>
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
              You get one PaySplit virtual card. Add it to DoorDash, Amazon, Uber — anywhere you shop online. Link your real cards, set how each purchase splits, and we handle the rest automatically.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="group gap-2 text-base" onClick={handleGetStarted}>
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Secured with Stripe
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Works on DoorDash, Uber Eats, Amazon & more
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="relative flex items-center justify-center"
          >
            <div className="relative w-full max-w-md">
              {/* Card stack visual */}
              <div className="relative h-64 w-full">
                {[
                  { label: "Chase Sapphire", last4: "4829", bg: "bg-slate-800", amount: "60%" },
                  { label: "Amex Gold", last4: "3721", bg: "bg-emerald-900", amount: "40%" },
                ].map((card, i) => (
                  <motion.div
                    key={i}
                    animate={{ y: i === 0 ? [-4, 4, -4] : [4, -4, 4] }}
                    transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute ${i === 0 ? "top-0 left-0" : "top-16 left-8"} w-72 rounded-2xl ${card.bg} border border-white/10 p-5`}
                    style={{ zIndex: 2 - i }}
                  >
                    <div className="flex justify-between items-start mb-8">
                      <span className="text-white/60 text-xs font-medium">{card.label}</span>
                      <span className="text-primary text-sm font-bold">{card.amount}</span>
                    </div>
                    <span className="text-white/40 text-sm tracking-widest">•••• •••• •••• {card.last4}</span>
                  </motion.div>
                ))}

                {/* PaySplit card on top */}
                <motion.div
                  animate={{ y: [-6, 6, -6] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-4 right-0 w-72 rounded-2xl p-5 border border-primary/50"
                  style={{ background: "linear-gradient(135deg, #064e3b, #10b981)", zIndex: 3 }}
                >
                  <div className="flex justify-between items-start mb-8">
                    <span className="text-emerald-200 text-xs font-bold tracking-widest">PAYSPLIT</span>
                    <span className="text-xl">⚡</span>
                  </div>
                  <div className="text-white/60 text-xs mb-1">2 cards · 1 transaction</div>
                  <span className="text-white text-sm tracking-widest">•••• •••• •••• 0005</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
