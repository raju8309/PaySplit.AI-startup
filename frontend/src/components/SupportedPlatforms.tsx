import { motion } from "framer-motion";

const platforms = [
  { name: "DoorDash", icon: "🚗" },
  { name: "Uber Eats", icon: "🍔" },
  { name: "Amazon", icon: "📦" },
  { name: "Instacart", icon: "🛒" },
  { name: "Grubhub", icon: "🍕" },
  { name: "Walmart", icon: "🏪" },
  { name: "Target", icon: "🎯" },
  { name: "Best Buy", icon: "🖥️" },
  { name: "Shopify Stores", icon: "🛍️" },
  { name: "eBay", icon: "🏷️" },
];

const SupportedPlatforms = () => {
  return (
    <section className="relative py-20 border-t border-border/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="mb-8 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Works on 500+ Sites Including
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {platforms.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 rounded-full border border-border/50 bg-secondary/40 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <span className="text-lg">{p.icon}</span>
                {p.name}
              </motion.div>
            ))}
            <div className="rounded-full border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary">
              + 490 more
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SupportedPlatforms;
