const green = "hsl(138, 38%, 28%)";
const greenLight = "hsl(138, 38%, 95%)";
const cream = "hsl(60, 30%, 96%)";
const blueLight = "hsl(200, 35%, 95%)";
const amberLight = "hsl(45, 50%, 94%)";
const greenDark = "hsl(138, 38%, 14%)";

interface Chapter {
  number: string;
  label: string;
  bg: string;
  accent: string;
  emoji: string;
  title: string;
  body: string[];
  quote: string | null;
}

const chapters: Chapter[] = [
  {
    number: "01",
    label: "Where It Started",
    bg: cream,
    accent: "#a07000",
    emoji: "🍔",
    title: "A declined card. A stupid idea. A startup.",
    body: [
      "One night, the three of us were sitting together, hungry, trying to order food on DoorDash. We picked everything out, went to checkout — and then it happened. The card declined.",
      "Not because any of us were broke. Between the three of us, we had more than enough. But one card was close to its limit, and DoorDash only accepts one card at a time. So there we were — money in our pockets, hungry, staring at a failed order.",
      `Anuroop said it first: "Why can't we just split this across two cards?" None of us had an answer. We started looking into it. The more we looked, the more we realized — nobody had solved this. That's when we decided to stop looking for a solution and start building one.`,
    ],
    quote: null,
  },
  {
    number: "02",
    label: "The First Week",
    bg: greenLight,
    accent: green,
    emoji: "💬",
    title: "We had no roadmap. Just a group chat and a lot of questions.",
    body: [
      "The first week was mostly just talking. Long late-night conversations about what this thing could actually be. Not just 'split the bill' — but something smarter. Something that actually understands your money.",
      "We asked ourselves: what if the system could figure out which card gives you better rewards at a particular store? What if it could warn you before a risky transaction? What if splitting a payment was as simple as tapping a button?",
      "We dreamed bigger than the DoorDash order that started it all.",
    ],
    quote: "We had no investors. No deadline. Just three friends who were tired of a problem that shouldn't exist.",
  },
  {
    number: "03",
    label: "Splitting The Work",
    bg: blueLight,
    accent: "#2a7a8c",
    emoji: "🔨",
    title: "Nobody had one fixed lane. We just built.",
    body: [
      "Then we got to work. We split things up naturally — not by a formal plan, just by what made sense. Raju took on the backend and the AI side of things, diving deep into how the system would think, and jumped into the frontend whenever needed.",
      "Rishikesh owned the payments side — making sure every transaction worked reliably and securely — and helped keep the backend solid.",
      "Anuroop built the machine learning models that make the smart decisions happen, while contributing across both the frontend and backend wherever the team needed an extra hand.",
      "We overlapped constantly. Picked up whatever needed doing. No ego about whose part was whose — it was always one thing we were building together.",
    ],
    quote: null,
  },
  {
    number: "04",
    label: "The Hard Weeks",
    bg: amberLight,
    accent: "#a07000",
    emoji: "🌙",
    title: "There were weeks where nothing worked.",
    body: [
      "There were weeks where it felt like real progress — features clicking into place, ideas working exactly the way we imagined. And there were other weeks where nothing worked and we weren't sure if we were even going in the right direction.",
      "But we kept showing up. Every night after classes, on weekends, during breaks. We'd share screens, argue about small decisions, laugh at the bugs we couldn't figure out.",
      "Slowly — very slowly — something real started taking shape.",
    ],
    quote: null,
  },
  {
    number: "05",
    label: "What We Built",
    bg: greenLight,
    accent: green,
    emoji: "🚀",
    title: "What started as a $14 order turned into something we're proud of.",
    body: [
      "A product that understands your cards, protects your payments, and makes smarter decisions for you — automatically.",
      "We never had a big launch moment. No announcement. No funding news. Just three people who sat down together every day and built something they actually wanted to use.",
      "The product you see today is the beginning — not the end. Every feature, every decision, every late night goes back to that same moment — staring at a declined DoorDash order, thinking: there has to be a better way.",
    ],
    quote: "Startups don't always start with a big idea. Sometimes they start with small frustrations — and that's exactly where innovation begins.",
  },
];

const BlogSection = () => {
  return (
    <section
      id="blog"
      style={{
        padding: 0,
        backgroundColor: "hsl(var(--background))",
        borderTop: "1px solid hsl(var(--border))",
      }}
    >
      <div style={{ padding: "96px 32px 72px", backgroundColor: "hsl(138, 38%, 95%)" }}>
        <div style={{ maxWidth: 1100, margin: 0 }}>
          <div style={{ textAlign: "left" }}>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", color: "hsl(var(--foreground))", margin: "0 0 14px", lineHeight: 1.1 }}>
            How PaySplit.AI was born
          </h2>
          <p style={{ fontSize: 15, color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.8, maxWidth: 820 }}>
            A behind-the-scenes look at how a declined DoorDash order turned into PaySplit.AI.
          </p>
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

export default BlogSection;