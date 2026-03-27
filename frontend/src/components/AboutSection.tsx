const green = "hsl(138, 38%, 28%)";
const greenLight = "hsl(138, 38%, 95%)";
const greenDark = "hsl(138, 38%, 14%)";
const cream = "hsl(60, 30%, 96%)";
const blueLight = "hsl(200, 35%, 95%)";
const amberLight = "hsl(45, 50%, 94%)";
const purpleLight = "hsl(260, 30%, 96%)";

interface Cofounder {
  initials: string;
  name: string;
  role: string;
  focus: string;
  bio: string;
  photo: string;
  linkedin: string;
  color: string;
}

const cofounders: Cofounder[] = [
  {
    initials: "RK",
    name: "Raju Kotturi",
    role: "Co-Founder",
    focus: "Backend · AI · Frontend",
    bio: "Led the backend architecture and AI systems, built the core engine that powers every smart decision in the product, and jumped into the frontend whenever needed.",
    photo: "/photos/raju.JPG",
    linkedin: "https://www.linkedin.com/in/raju-kotturi-609674304/",
    color: "hsl(138, 38%, 14%)",
  },
  {
    initials: "RV",
    name: "Rishikesh Velpula",
    role: "Co-Founder",
    focus: "Fullstack · Payments",
    bio: "Drove the payments integration and helped keep the backend solid — making sure every transaction was handled reliably and securely from end to end.",
    photo: "/photos/rishikesh.jpeg",
    linkedin: "https://www.linkedin.com/in/rishikesh-velpula-4097771ba/",
    color: "hsl(0, 5.90%, 3.30%)",
  },
  {
    initials: "AJ",
    name: "Anuroop Jajoba",
    role: "Co-Founder",
    focus: "ML · Backend · Frontend",
    bio: "Built the machine learning models that make the smart card decisions happen, while contributing across both the backend and frontend wherever the team needed a hand.",
    photo: "/photos/anuroop.jpeg",
    linkedin: "https://www.linkedin.com/in/anuroop-jajoba-4487031a2/",
    color: "hsl(270, 7.10%, 5.50%)",
  },
];

interface Chapter {
  number: string;
  label: string;
  bg: string;
  accent: string;
  emoji: string;
  title: string;
  body: string[];
  quote: string | null;
  showTeam?: boolean;
}

const chapters: Chapter[] = [
  {
    number: "01",
    label: "Who We Are",
    bg: cream,
    accent: "#a07000",
    emoji: "👋",
    title: "Three friends from UNH Manchester.",
    body: [
      "We met as graduate students at the University of New Hampshire Manchester — three people who liked building things and asking 'why doesn't this exist yet?'",
      "We didn't set out to start a company. We just kept ending up in the same conversations — about technology, about money, about small frustrations that added up to big opportunities. One of those conversations changed everything.",
      "PaySplit.AI is what happens when three people with different skills decide to stop complaining about a problem and start solving it.",
    ],
    quote: null,
  },
  {
    number: "02",
    label: "What We Believe",
    bg: greenLight,
    accent: green,
    emoji: "💡",
    title: "Payments should be smart, not stressful.",
    body: [
      "Every time you pay for something, you're making a small financial decision. Which card? Does it have enough? Will I get rewards? Am I close to my limit?",
      "Most people don't think about this — they just tap and hope. We think there's a better way. A way where the system does the thinking for you. Where your money works smarter without you having to manage it manually.",
      "That's the belief that drives everything we build.",
    ],
    quote: "Your cards should work for you — not the other way around.",
  },
  {
    number: "03",
    label: "The Team",
    bg: blueLight,
    accent: "#2a7a8c",
    emoji: "🤝",
    title: "We each owned a piece. We always helped each other.",
    body: [
      "We didn't divide the work neatly into boxes. We split it by instinct — who was best at what, and who had the energy that week. We overlapped constantly, picked up whatever needed doing, and never let 'that's not my part' slow us down.",
    ],
    quote: null,
    showTeam: true,
  },
  {
    number: "04",
    label: "How We Work",
    bg: amberLight,
    accent: "#a07000",
    emoji: "⚡",
    title: "Late nights, shared screens, and a lot of trust.",
    body: [
      "There was no office. No formal standup. Just a group chat that never went quiet, screens shared across laptops at odd hours, and the kind of trust that only comes from building something hard together.",
      "We argued about small decisions. We laughed at the bugs we couldn't figure out. We celebrated the moments when something finally worked. And we kept showing up — every night after classes, on weekends, during breaks — because we believed in what we were building.",
    ],
    quote: null,
  },
  {
    number: "05",
    label: "What's Next",
    bg: purpleLight,
    accent: "#5a3ea0",
    emoji: "🚀",
    title: "We're just getting started.",
    body: [
      "The product you see today is the beginning, not the end. There's a lot more we want to build — smarter predictions, deeper integrations, and tools that make managing your money feel effortless.",
      "We're still the same three people who started this over a declined DoorDash order. The ambition has just gotten bigger.",
    ],
    quote: "We started with a $14 food order. We're building for every payment after that.",
  },
];

const TeamCard = ({ c, idx }: { c: Cofounder; idx: number }) => {
  const imageRight = idx % 2 === 0;
  return (
    <div style={{
      display: "flex",
      flexDirection: imageRight ? "row" : "row-reverse",
      alignItems: "flex-start",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "clamp(24px, 4vw, 48px)",
      rowGap: 24,
      padding: "28px 28px",
      backgroundColor: `${c.color}10`,
      border: `1px solid ${c.color}1f`,
      borderRadius: 20,
      marginBottom: idx < cofounders.length - 1 ? 16 : 0,
    }}>
      <div style={{ flex: "1 1 520px" }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: c.color, marginBottom: 8 }}>
          {c.role}
        </p>
        <h4 style={{ fontSize: "clamp(22px, 2.4vw, 28px)", fontWeight: 800, letterSpacing: "-0.02em", color: "#1a1a1a", margin: "0 0 10px", lineHeight: 1.15 }}>
          {c.name}
        </h4>
        <span style={{
          display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase" as const, backgroundColor: `${c.color}15`,
          color: c.color, padding: "4px 12px", borderRadius: 999,
          border: `1px solid ${c.color}30`, marginBottom: 16,
        }}>
          {c.focus}
        </span>
        <p style={{ fontSize: 15, color: "#555", lineHeight: 1.8, margin: "0 0 24px" }}>
          {c.bio}
        </p>
        <a href={c.linkedin} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          backgroundColor: c.color, color: "#fff",
          fontSize: 13, fontWeight: 700,
          padding: "11px 24px", borderRadius: 999,
          textDecoration: "none",
        }}>
          View LinkedIn ↗
        </a>
      </div>
      <div style={{ flex: "0 0 260px", width: 260, maxWidth: "40vw" }}>
        {c.photo ? (
          <img
            src={c.photo}
            alt={c.name}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const next = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (next) next.style.display = "flex";
            }}
            style={{
              width: "100%",
              height: "auto",
              maxHeight: 320,
              objectFit: "contain",
              objectPosition: "center",
              borderRadius: 20,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              display: "block",
              backgroundColor: "rgba(255,255,255,0.55)",
            }}
          />
        ) : (
          <div />
        )}
        <div
          style={{
            width: "100%",
            aspectRatio: "26 / 30",
            borderRadius: 20,
            backgroundColor: c.color,
            display: c.photo ? "none" : "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            fontWeight: 800,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {c.initials}
        </div>
      </div>
    </div>
  );
};

const AboutSection = () => {
  return (
    <section id="about" style={{
      padding: 0,
      backgroundColor: "hsl(var(--background))",
      borderTop: "1px solid hsl(var(--border))",
    }}>
      <div style={{ padding: "96px 48px 72px" }}>
        <div style={{ maxWidth: 1100, margin: 0 }}>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: green, marginBottom: 14 }}>
              ABOUT US
            </p>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", color: "hsl(var(--foreground))", margin: "0 0 20px", lineHeight: 1.1 }}>
              Meet the team behind PaySplit.AI
            </h2>
            <p style={{ fontSize: 15, color: "hsl(var(--muted-foreground))", maxWidth: 720, margin: "0 0 24px", lineHeight: 1.7 }}>
              Three grad students. One shared frustration. A fintech product built from scratch.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              {cofounders.map((c, idx) => (
                <div key={c.initials} title={c.name} style={{
                  width: 42, height: 42, borderRadius: "50%",
                  backgroundColor: c.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: "#fff",
                  border: "2px solid #fff",
                  marginLeft: idx === 0 ? 0 : -10,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                }}>
                  {c.initials}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        {chapters.map((ch, idx) => (
          <div
            key={ch.number}
            style={{
              backgroundColor: ch.bg,
              borderTop: idx === 0 ? "1px solid rgba(0,0,0,0.06)" : "none",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              padding: "64px 48px",
            }}
          >
            <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "left" as const }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: ch.accent, opacity: 0.18, letterSpacing: "-0.04em", lineHeight: 1 }}>
                    {ch.number}
                  </span>
                  <div style={{ width: 1, height: 28, backgroundColor: ch.accent, opacity: 0.2 }} />
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: ch.accent }}>
                    {ch.label}
                  </span>
                </div>
                <span style={{ fontSize: 28 }}>{ch.emoji}</span>
              </div>

              <h3 style={{ fontSize: "clamp(20px, 2.2vw, 26px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#1a1a1a", margin: "0 0 24px", lineHeight: 1.25 }}>
                {ch.title}
              </h3>

              {ch.body.map((para, i) => (
                <p key={i} style={{ fontSize: 15, color: "#4a4a4a", lineHeight: 1.9, margin: "0 0 18px", maxWidth: 860 }}>
                  {para}
                </p>
              ))}

              {ch.showTeam && (
                <div style={{ marginTop: 16 }}>
                  {cofounders.map((c, idx2) => (
                    <TeamCard key={c.initials} c={c} idx={idx2} />
                  ))}
                </div>
              )}

              {ch.quote && (
                <div style={{ margin: "28px 0 0", padding: "22px 28px", backgroundColor: "#fff", borderLeft: `4px solid ${ch.accent}`, borderRadius: "0 12px 12px 0", fontSize: 15, fontStyle: "italic", color: "#333", lineHeight: 1.75 }}>
                  "{ch.quote}"
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AboutSection;
