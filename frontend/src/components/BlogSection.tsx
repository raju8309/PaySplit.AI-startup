import React, { useState, useEffect, useRef } from 'react';

const softPastelBg = "linear-gradient(135deg, #E8F5E9 0%, #F0F7F0 50%, #FFFFFF 100%)"; // Soft green to white gradient mix
const accentGreen = "#76C043"; // Bright green accent

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
    bg: "linear-gradient(135deg, #E8F5E9 0%, #F0F7F0 50%, #FFFFFF 100%)",
    accent: accentGreen,
    emoji: "",
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
    bg: "linear-gradient(135deg, #E8F5E9 0%, #F0F7F0 50%, #FFFFFF 100%)",
    accent: accentGreen,
    emoji: "",
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
    bg: "linear-gradient(135deg, #E8F5E9 0%, #F0F7F0 50%, #FFFFFF 100%)",
    accent: accentGreen,
    emoji: " ",
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
    bg: "linear-gradient(135deg, #E8F5E9 0%, #F0F7F0 50%, #FFFFFF 100%)",
    accent: accentGreen,
    emoji: "",
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
    bg: "linear-gradient(135deg, #E8F5E9 0%, #F0F7F0 50%, #FFFFFF 100%)",
    accent: accentGreen,
    emoji: "",
    title: "What started as a $14 order turned into something we're proud of.",
    body: [
      "A product that understands your cards, protects your payments, and makes smarter decisions for you — automatically.",
      "We never had a big launch moment. No announcement. No funding news. Just three people who sat down together every day and built something they actually wanted to use.",
      "The product you see today is the beginning — not the end. Every feature, every decision, every late night goes back to that same moment — staring at a declined DoorDash order, thinking: there has to be a better way.",
    ],
    quote: "Startups don't always start with a big idea. Sometimes they start with small frustrations — and that's exactly where innovation begins.",
  },
];

const ChapterSection = ({ chapter, idx }: { chapter: Chapter; idx: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        background: chapter.bg,
        borderTop: "1px solid rgba(0,0,0,0.06)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        padding: "64px 48px",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(40px)",
        transition: "opacity 0.8s ease, transform 0.8s ease",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "left" as const }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: chapter.accent, opacity: 0.18, letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "'Inter', sans-serif" }}>
              {chapter.number}
            </span>
            <div style={{ width: 1, height: 28, backgroundColor: chapter.accent, opacity: 0.2 }} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: chapter.accent, fontFamily: "'Inter', sans-serif" }}>
              {chapter.label}
            </span>
          </div>
          <span style={{ fontSize: 28 }}>{chapter.emoji}</span>
        </div>

        <h3 style={{ fontSize: "clamp(20px, 2.2vw, 26px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#1a1a1a", margin: "0 0 24px", lineHeight: 1.25, fontFamily: "'Inter', sans-serif", opacity: isVisible ? 1 : 0, transform: isVisible ? "translateX(0)" : "translateX(-20px)", transition: "opacity 0.8s ease 0.1s, transform 0.8s ease 0.1s" }}>
          {chapter.title}
        </h3>

        {chapter.body.map((para, i) => (
          <p key={i} style={{ fontSize: 15, color: "#4a4a4a", lineHeight: 1.9, margin: "0 0 18px", maxWidth: 860, fontFamily: "'Inter', sans-serif", opacity: isVisible ? 1 : 0, transform: isVisible ? "translateX(0)" : "translateX(-20px)", transition: `opacity 0.8s ease ${0.15 + i * 0.15}s, transform 0.8s ease ${0.15 + i * 0.15}s` }}>
            {para}
          </p>
        ))}

        {chapter.quote && (
          <div style={{ margin: "28px 0 0", padding: "22px 28px", backgroundColor: "#ffffff", borderLeft: `4px solid ${chapter.accent}`, borderRadius: "0 12px 12px 0", fontSize: 14, fontStyle: "italic", color: "#000000", lineHeight: 1.75, fontFamily: "'Inter', sans-serif", opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s" }}>
            "{chapter.quote}"
          </div>
        )}
      </div>
    </div>
  );
};

const BlogSection = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeaderVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="blog"
      style={{
        padding: 0,
        background: "linear-gradient(135deg, #E8F5E9 0%, #F0F7F0 50%, #FFFFFF 100%)",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        ref={headerRef}
        style={{
          padding: "96px 32px 72px",
          background: "linear-gradient(135deg, #E8F5E9 0%, #F0F7F0 50%, #FFFFFF 100%)",
          opacity: headerVisible ? 1 : 0,
          transform: headerVisible ? "translateY(0)" : "translateY(40px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
        }}
      >
        <div style={{ maxWidth: 1100, margin: 0 }}>
          <div style={{ textAlign: "left" }}>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", color: "#1a1a1a", margin: "0 0 14px", lineHeight: 1.1, fontFamily: "'Inter', sans-serif", opacity: headerVisible ? 1 : 0, transform: headerVisible ? "translateX(0)" : "translateX(-20px)", transition: "opacity 0.8s ease 0.1s, transform 0.8s ease 0.1s" }}>
              How PaySplit.AI was born
            </h2>
            <p style={{ fontSize: 15, color: "#5a5a5a", margin: 0, lineHeight: 1.8, maxWidth: 820, fontFamily: "'Inter', sans-serif", opacity: headerVisible ? 1 : 0, transform: headerVisible ? "translateX(0)" : "translateX(-20px)", transition: "opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s" }}>
              A behind-the-scenes look at how a declined DoorDash order turned into PaySplit.AI.
            </p>
          </div>
        </div>
      </div>

      {/* Chapters */}
      <div>
        {chapters.map((ch, idx) => (
          <ChapterSection key={ch.number} chapter={ch} idx={idx} />
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "72px 32px", background: "linear-gradient(135deg, #E8F5E9 0%, #F0F7F0 50%, #FFFFFF 100%)" }}>
        <div style={{ maxWidth: 1100, margin: 0, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#5a5a5a", margin: 0, fontFamily: "'Inter', sans-serif" }}>
            © PaySplit.AI. All rights reserved.
          </p>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;