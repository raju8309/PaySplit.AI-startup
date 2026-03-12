import { Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    // If on home page, scroll. Otherwise go home first then scroll.
    if (window.location.pathname === "/") {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 400);
    }
  };

  const productLinks = [
    { label: "How It Works", id: "how-it-works" },
    { label: "AI Features",  id: "ai-features"  },
    { label: "Pricing",      id: "pricing"       },
    { label: "Security",     id: "security"      },
  ];

  const companyLinks = [
    { label: "About Us", href: "/about" },
    { label: "Blog",     href: "/blog"  },
  ];

  const linkStyle = {
    background: "none", border: "none", padding: 0,
    fontSize: 14, color: "hsl(var(--muted-foreground))",
    cursor: "pointer", textAlign: "left" as const,
    transition: "color 0.15s", textDecoration: "none",
    display: "block",
  };

  return (
    <footer style={{ borderTop: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 32px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 48, marginBottom: 56 }}>

          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{
                height: 34, width: 34, borderRadius: 9,
                backgroundColor: "hsl(var(--primary))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Zap size={15} color="#fff" fill="#fff" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 16, color: "hsl(var(--foreground))" }}>
                PaySplit <span style={{ color: "hsl(var(--primary))" }}>AI</span>
              </span>
            </div>
            <p style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", lineHeight: 1.65, maxWidth: 240, margin: 0 }}>
              Intelligent payment splitting for the modern shopper.
            </p>
          </div>

          {/* Product */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "hsl(var(--foreground))", textTransform: "uppercase", marginBottom: 18 }}>
              Product
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {productLinks.map((l) => (
                <button key={l.id} onClick={() => scrollTo(l.id)} style={linkStyle}
                  onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                  onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "hsl(var(--foreground))", textTransform: "uppercase", marginBottom: 18 }}>
              Company
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {companyLinks.map((l) => (
                <a key={l.href} href={l.href} style={linkStyle}
                  onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
                  onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: 24, display: "flex", justifyContent: "center" }}>
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: 0 }}>
            © 2026 PaySplit AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;