import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { useCheckout, useStepGuard } from "@/checkout";
import { formatMoney } from "@/money";
import { remainingToCollectCents } from "@/ledger";
import { CART_CENTS, cardTitle, order, paysplitCard } from "@/sample";
import { ink, muted, systemFont } from "@/theme";
import { Body, MoneyRow, PaySplitCard, Screen, SectionLabel } from "@/ui";

export default function HomeScreen() {
  const { session, dispatch } = useCheckout();
  useStepGuard("home");
  const remaining = remainingToCollectCents(CART_CENTS, session.decision);

  if (session.phase === "empty") {
    return (
      <Screen
        title="PaySplit"
        testID="home-title"
        action={{
          label: "Start",
          testID: "start-checkout",
          onPress: () => dispatch({ type: "start" }),
        }}
      >
        <Body>DoorDash charges one card. This sample checkout is $25.00.</Body>
      </Screen>
    );
  }

  if (session.phase !== "open") return null;

  return (
    <Screen
      title="Checkout"
      testID="home-title"
      action={{
        label: "Open checkout",
        testID: "open-checkout",
        onPress: () => router.push("/caps"),
      }}
    >
      <Body>{`${order.merchant} · ${order.place}`}</Body>
      <MoneyRow label="Cart" value={formatMoney(CART_CENTS)} />

      <SectionLabel>Still to collect</SectionLabel>
      <Text testID="still-to-collect" style={styles.due}>
        {formatMoney(remaining)}
      </Text>
      <Text style={styles.note}>Nothing collected yet.</Text>

      <SectionLabel>Caps</SectionLabel>
      {session.caps.map((cap) => (
        <MoneyRow
          key={cap.cardId}
          label={cardTitle(cap.label, cap.last4)}
          value={formatMoney(cap.capCents)}
          note={session.fundingActive ? "Active" : "Inactive"}
        />
      ))}

      <SectionLabel>PaySplit card</SectionLabel>
      <PaySplitCard
        compact
        testID="paysplit-card-summary"
        amount={formatMoney(CART_CENTS)}
        last4={paysplitCard.last4}
        exp={paysplitCard.exp}
        active={session.paysplitActive}
      />

      <SectionLabel>Order</SectionLabel>
      {order.lines.map((line) => (
        <MoneyRow key={line.label} label={line.label} value={formatMoney(line.cents)} />
      ))}
      <Body>Sample checkout. No bank or card is charged.</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  due: {
    fontFamily: systemFont,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    color: ink,
  },
  note: {
    fontFamily: systemFont,
    fontSize: 16,
    lineHeight: 22,
    color: muted,
    marginTop: 4,
  },
});
