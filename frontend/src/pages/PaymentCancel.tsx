import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle, RotateCcw, LayoutDashboard } from "lucide-react";

export default function PaymentCancel() {
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-body flex items-center justify-center px-4">

      {/* Red radial glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 50% 40% at 50% 40%, hsl(var(--destructive) / 0.08), transparent 70%)",
        }}
      />

      <div
        className={`relative z-10 w-full max-w-md transition-all duration-700 ease-out ${
          animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="glass-strong gradient-border rounded-3xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-destructive/60 via-destructive/40 to-destructive/60" />

          <div className="p-8 flex flex-col items-center text-center">

            {/* Icon */}
            <div className={`relative mb-6 transition-all duration-700 delay-200 ${animate ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
              <div className="h-20 w-20 rounded-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center">
                <XCircle size={40} className="text-destructive" />
              </div>
            </div>

            {/* Text */}
            <div className={`transition-all duration-500 delay-300 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
                Payment Cancelled
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                No charges were made. Your cards are safe — you can retry the split anytime.
              </p>
            </div>

            {/* Info box */}
            <div className={`w-full my-7 transition-all duration-500 delay-400 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <div className="rounded-xl bg-secondary/30 border border-border/50 px-5 py-4 text-left space-y-2">
                {[
                  "No money was charged to any card",
                  "Your split settings are still saved",
                  "You can retry from the dashboard",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className={`w-full flex flex-col gap-3 transition-all duration-500 delay-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <button
                onClick={() => navigate("/split")}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition glow-primary"
              >
                <RotateCcw size={15} />
                Try Again
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 py-3.5 text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition"
              >
                <LayoutDashboard size={15} />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-4">
          Secured by PaySplit AI · Powered by Stripe
        </p>
      </div>
    </div>
  );
}