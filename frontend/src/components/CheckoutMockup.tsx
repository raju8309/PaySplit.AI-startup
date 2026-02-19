import { motion } from "framer-motion";
import { Chrome, CreditCard, Check, Lock, ChevronDown } from "lucide-react";

const CheckoutMockup = () => {
  return (
    <section className="relative py-32">
      <div className="pointer-events-none absolute left-1/3 top-1/3 h-96 w-96 rounded-full bg-accent/5 blur-[150px]" />

      <div className="container relative mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            See It In Action
          </p>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            Right Inside Your Checkout
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            PaySplit injects directly into the payment page. No popups, no redirects
            — just a seamless split option.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl"
        >
          {/* Browser chrome */}
          <div className="overflow-hidden rounded-2xl border border-border shadow-2xl shadow-primary/5">
            {/* Browser toolbar */}
            <div className="flex items-center gap-3 border-b border-border bg-secondary/80 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-primary/60" />
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                doordash.com/checkout
              </div>
              <Chrome className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Checkout page content */}
            <div className="bg-card p-6 md:p-8">
              {/* Order summary */}
              <div className="mb-6 rounded-lg bg-secondary/50 p-4">
                <h4 className="mb-3 text-sm font-semibold text-foreground">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Spicy Chicken Sandwich × 1</span>
                    <span>$8.99</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Fries (Large)</span>
                    <span>$3.49</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery fee</span>
                    <span>$1.99</span>
                  </div>
                  <div className="border-t border-border pt-2">
                    <div className="flex justify-between font-semibold text-foreground">
                      <span>Total</span>
                      <span>$14.47</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Standard payment (greyed out) */}
              <div className="mb-4 rounded-lg border border-border p-4 opacity-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Pay with one card</p>
                      <p className="text-xs text-muted-foreground">Visa ending in 4242</p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* PaySplit injected option - highlighted */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="relative rounded-lg border-2 border-primary/50 bg-primary/5 p-4 glow-primary"
              >
                <div className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground">
                  PaySplit AI
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Split across 2 cards
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Visa ····4242 ($12.00) + Mastercard ····8888 ($2.47)
                      </p>
                    </div>
                  </div>
                  <Check className="h-5 w-5 text-primary" />
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-primary/80">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5">
                    💰 Saves $0.37 in rewards
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5">
                    ⚡ AI optimized
                  </span>
                </div>
              </motion.div>

              {/* Place order button */}
              <div className="mt-6 rounded-lg bg-primary/80 py-3 text-center text-sm font-semibold text-primary-foreground">
                Place Order — $14.47
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CheckoutMockup;
