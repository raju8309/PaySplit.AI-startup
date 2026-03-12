import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { XCircle, ArrowLeft, Zap } from "lucide-react";

export default function PaymentCancel() {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  useEffect(() => { setTimeout(() => setAnimate(true), 100); }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <nav className="sticky top-0 z-50 glass-strong border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center glow-primary">
            <Zap size={16} className="text-primary-foreground fill-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">PaySplit AI</span>
        </div>
      </nav>

      <div className="mx-auto max-w-lg px-6 py-20">
        <div className={`transition-all duration-700 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>

          <div className="flex justify-center mb-8">
            <div className="h-20 w-20 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <XCircle size={36} className="text-destructive" />
            </div>
          </div>

          <h1 className="font-display text-4xl font-bold text-center mb-2">Payment Cancelled</h1>
          <p className="text-center text-muted-foreground text-sm mb-8">
            No charges were made. You can try again anytime.
          </p>

          <div className="glass gradient-border rounded-2xl px-5 py-4 mb-8">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><span className="text-primary">✓</span> No charges made to any card</li>
              <li className="flex items-center gap-2"><span className="text-primary">✓</span> Your cards are safe</li>
              <li className="flex items-center gap-2"><span className="text-primary">✓</span> Split settings were not saved</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/split")}
              className="flex-1 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition glow-primary"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 px-5 py-3.5 text-sm font-bold text-foreground hover:bg-secondary transition"
            >
              <ArrowLeft size={14} />
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}