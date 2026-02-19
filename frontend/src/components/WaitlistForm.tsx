import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Mail, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const WaitlistForm = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Generate a random temp password for waitlist signups
      const tempPassword = Math.random().toString(36).slice(-10);
      const name = trimmed.split("@")[0]; // use part before @ as name

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: trimmed, password: tempPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If already registered, still show success (they're already on the list)
        if (res.status === 400 && data.detail?.includes("already registered")) {
          setSubmitted(true);
          toast({
            title: "Already on the list! 🎉",
            description: "You're already signed up. We'll notify you at launch.",
          });
        } else {
          throw new Error(data.detail || "Something went wrong");
        }
      } else {
        // Save token in case user wants to log in later
        localStorage.setItem("token", data.access_token);
        setSubmitted(true);
        toast({
          title: "You're on the list! 🎉",
          description: "We'll notify you as soon as PaySplit launches.",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative py-32">
      <div className="pointer-events-none absolute left-1/4 bottom-0 h-96 w-96 rounded-full bg-primary/5 blur-[150px]" />

      <div className="container relative mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            Get Early Access
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Be the first to know when PaySplit launches. Early members get
            lifetime access to the Free tier + 3 months of Pro.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-md">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/50 py-3.5 pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                    required
                    maxLength={255}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="gap-2 whitespace-nowrap"
                >
                  {loading ? "Joining..." : "Join Waitlist"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                No spam, ever. Unsubscribe anytime.
              </p>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto mt-8 max-w-md rounded-2xl border border-primary/30 bg-primary/5 p-6"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <p className="font-display text-lg font-semibold text-foreground">
                You're on the list!
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                We'll email you at <span className="text-foreground">{email}</span> when
                we launch.
              </p>
            </motion.div>
          )}

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            <span>
              <span className="font-semibold text-foreground">2,847</span> people
              already on the waitlist
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WaitlistForm;