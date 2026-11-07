import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { router, usePathname, type Href } from "expo-router";

import { decideTwoCardCheckout, type CheckoutDecision } from "@/ledger";
import { CART_CENTS, cardTitle, fundingCards } from "@/sample";

export const REVEAL_MS = 1100;

export type Phase = "empty" | "open" | "waiting" | "approved" | "declined" | "closed";

export type FundingCap = {
  cardId: string;
  label: string;
  last4: string;
  capCents: number;
};

export type Session = {
  phase: Phase;
  caps: [FundingCap, FundingCap];
  paysplitActive: boolean;
  fundingActive: boolean;
  decision: CheckoutDecision | null;
};

type Action =
  | { type: "start" }
  | { type: "save"; capCents: [number, number] }
  | { type: "charge" }
  | { type: "reveal" }
  | { type: "close" }
  | { type: "adjust" }
  | { type: "done" };

type ScreenId = "home" | "caps" | "card" | "result" | "closed";

function copyCaps(): [FundingCap, FundingCap] {
  return [
    {
      cardId: fundingCards[0].cardId,
      label: fundingCards[0].label,
      last4: fundingCards[0].last4,
      capCents: fundingCards[0].capCents,
    },
    {
      cardId: fundingCards[1].cardId,
      label: fundingCards[1].label,
      last4: fundingCards[1].last4,
      capCents: fundingCards[1].capCents,
    },
  ];
}

function emptySession(): Session {
  return {
    phase: "empty",
    caps: copyCaps(),
    paysplitActive: false,
    fundingActive: false,
    decision: null,
  };
}

function reduce(state: Session, action: Action): Session {
  switch (action.type) {
    case "start":
      if (state.phase !== "empty") return state;
      return {
        phase: "open",
        caps: copyCaps(),
        paysplitActive: true,
        fundingActive: true,
        decision: null,
      };
    case "save": {
      if (state.phase !== "open" && state.phase !== "declined") return state;
      return {
        ...state,
        phase: "open",
        decision: null,
        paysplitActive: true,
        fundingActive: true,
        caps: [
          { ...state.caps[0], capCents: action.capCents[0] },
          { ...state.caps[1], capCents: action.capCents[1] },
        ],
      };
    }
    case "charge": {
      if (state.phase !== "open") return state;
      const decision = decideTwoCardCheckout({
        cartCents: CART_CENTS,
        caps: [
          {
            cardId: state.caps[0].cardId,
            label: cardTitle(state.caps[0].label, state.caps[0].last4),
            capCents: state.caps[0].capCents,
          },
          {
            cardId: state.caps[1].cardId,
            label: cardTitle(state.caps[1].label, state.caps[1].last4),
            capCents: state.caps[1].capCents,
          },
        ],
      });
      return { ...state, phase: "waiting", decision };
    }
    case "reveal":
      if (state.phase !== "waiting" || !state.decision) return state;
      return { ...state, phase: state.decision.status };
    case "close":
      if (state.phase !== "approved") return state;
      return { ...state, phase: "closed", paysplitActive: false, fundingActive: false };
    case "adjust":
      if (state.phase !== "declined") return state;
      return { ...state, phase: "open", decision: null };
    case "done":
      return emptySession();
    default:
      return state;
  }
}

const CheckoutContext = createContext<{
  session: Session;
  dispatch: (action: Action) => void;
} | null>(null);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [session, dispatch] = useReducer(reduce, undefined, emptySession);
  const value = useMemo(() => ({ session, dispatch }), [session]);
  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
  const value = useContext(CheckoutContext);
  if (!value) throw new Error("Checkout is only available inside CheckoutProvider");
  return value;
}

function screenFromPath(pathname: string): ScreenId | null {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/") return "home";
  if (path === "/caps") return "caps";
  if (path === "/card") return "card";
  if (path === "/result") return "result";
  if (path === "/closed") return "closed";
  return null;
}

function redirectFor(screen: ScreenId, phase: Phase): Href | null {
  switch (screen) {
    case "home":
      if (phase === "waiting" || phase === "approved" || phase === "declined") return "/result";
      if (phase === "closed") return "/closed";
      return null;
    case "caps":
      if (phase === "open" || phase === "declined") return null;
      if (phase === "waiting" || phase === "approved") return "/result";
      if (phase === "closed") return "/closed";
      return "/";
    case "card":
      if (phase === "open") return null;
      if (phase === "waiting" || phase === "approved" || phase === "declined") return "/result";
      if (phase === "closed") return "/closed";
      return "/";
    case "result":
      if (phase === "waiting" || phase === "approved" || phase === "declined") return null;
      if (phase === "open") return "/caps";
      if (phase === "closed") return "/closed";
      return "/";
    case "closed":
      if (phase === "closed") return null;
      if (phase === "waiting" || phase === "approved" || phase === "declined") return "/result";
      return "/";
  }
}

/** Keep a screen that is still mounted under the stack from stealing the visible route. */
export function useStepGuard(screen: ScreenId) {
  const pathname = usePathname();
  const { session } = useCheckout();
  useEffect(() => {
    if (screenFromPath(pathname) !== screen) return;
    const href = redirectFor(screen, session.phase);
    if (href) router.replace(href);
  }, [pathname, screen, session.phase]);
}
