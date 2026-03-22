import { useEffect, useState } from "react";

const cards = [
  { label: "Chase Sapphire", last4: "4829", bg: "#1a1a2e", bar: "#4f46e5" },
  { label: "Amex Gold", last4: "3721", bg: "#1a2e1a", bar: "#10b981" },
  { label: "Citi Double", last4: "9104", bg: "#2e1a1a", bar: "#ef4444" },
];

export default function LandingPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const run = () => {
      setStep(0);
      setCollapsed(false);
      setTimeout(() => setStep(1), 800);
      setTimeout(() => setStep(2), 1600);
      setTimeout(() => setStep(3), 2400);
      setTimeout(() => setCollapsed(true), 3200);
    };
    run();
    const interval = setInterval(run, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", flexDirection:"column", fontFamily:"'Inter', sans-serif" }}>
      <nav style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"1.5rem 3rem", borderBottom:"1px solid #1a1a1a" }}>
        <span style={{ color:"#fff", fontWeight:700, fontSize:"1.1rem", letterSpacing:"-0.02em" }}>paysplit.in</span>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#10b981", display:"inline-block", boxShadow:"0 0 8px #10b981", animation:"pulse 2s infinite" }} />
          <span style={{ color:"#10b981", fontSize:"0.8rem", fontWeight:600, letterSpacing:"0.1em" }}>BUILDING</span>
        </div>
      </nav>
      <main style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"4rem 3rem", gap:"4rem", maxWidth:1200, margin:"0 auto", width:"100%" }}>
        <div style={{ flex:1 }}>
          <p style={{ color:"#10b981", fontSize:"0.85rem", fontWeight:600, letterSpacing:"0.1em", marginBottom:"1.5rem", fontFamily:"monospace" }}>$ coming soon</p>
          <h1 style={{ color:"#fff", fontSize:"clamp(2.5rem, 5vw, 4rem)", fontWeight:800, lineHeight:1.05, letterSpacing:"-0.03em", margin:"0 0 1.5rem" }}>
            One checkout,{" "}<span style={{ color:"#10b981" }}>many cards.</span>
          </h1>
          <p style={{ color:"#666", fontSize:"1rem", lineHeight:1.7, maxWidth:420, margin:"0 0 2.5rem", fontFamily:"monospace" }}>
            Card declined? Not enough balance? PaySplit splits a single online payment across multiple cards — at checkout, instantly. No more choosing.
          </p>
        </div>
        <div style={{ flex:1, display:"flex", justifyContent:"center", alignItems:"center", position:"relative", minHeight:340 }}>
          <div style={{ position:"relative", width:320, height:200 }}>
            {cards.map((card, i) => {
              const visible = step > i;
              const yOffset = collapsed ? 0 : visible ? -(i * 52) : 20;
              const opacity = collapsed ? 0 : visible ? 1 : 0;
              const rotate = collapsed ? 0 : visible ? (i - 1) * 3 : 0;
              return (
                <div key={i} style={{ position:"absolute", bottom:0, left:0, width:300, height:180, borderRadius:16, background:card.bg, border:"1px solid #222", padding:"1.25rem 1.5rem", transform:`translateY(${yOffset}px) rotate(${rotate}deg)`, opacity, transition:"all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)", zIndex:cards.length - i }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <span style={{ color:"#888", fontSize:"0.75rem", fontWeight:500 }}>{card.label}</span>
                    <div style={{ width:32, height:20, borderRadius:4, background:card.bar, opacity:0.8 }} />
                  </div>
                  <div style={{ marginTop:"auto", paddingTop:"3rem" }}>
                    <span style={{ color:"#555", fontSize:"0.85rem", letterSpacing:"0.15em" }}>•••• •••• •••• {card.last4}</span>
                  </div>
                </div>
              );
            })}
            <div style={{ position:"absolute", bottom:0, left:0, width:300, height:180, borderRadius:16, background:"linear-gradient(135deg, #064e3b 0%, #10b981 100%)", padding:"1.25rem 1.5rem", transform:`translateY(${collapsed ? 0 : 30}px)`, opacity:collapsed ? 1 : 0, transition:"all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)", zIndex:10, border:"1px solid #10b981" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <span style={{ color:"#a7f3d0", fontSize:"0.75rem", fontWeight:600, letterSpacing:"0.05em" }}>PAYSPLIT</span>
                <span style={{ fontSize:20 }}>⚡</span>
              </div>
              <div style={{ marginTop:"2.5rem" }}>
                <div style={{ color:"#fff", fontSize:"0.7rem", marginBottom:4, opacity:0.7 }}>3 cards · 1 transaction</div>
                <span style={{ color:"#fff", fontSize:"0.9rem", letterSpacing:"0.15em", fontWeight:500 }}>•••• •••• •••• 0005</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer style={{ padding:"1.5rem 3rem", borderTop:"1px solid #1a1a1a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ color:"#333", fontSize:"0.8rem", fontFamily:"monospace" }}>© 2026 PaySplit AI</span>
        <span style={{ color:"#333", fontSize:"0.8rem", fontFamily:"monospace" }}>Built by Anuroop · Raju · Rishikesh</span>
      </footer>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
