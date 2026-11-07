import { useEffect } from "react";
import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { REVEAL_MS, useCheckout, useStepGuard } from "@/checkout";
import { declineHeadline } from "@/ledger";
import { formatMoney } from "@/money";
import { CART_CENTS, cardTitle } from "@/sample";
import { ink, systemFont } from "@/theme";
import { Body, MoneyRow, Screen } from "@/ui";

export default function ResultScreen() {
  const { session, dispatch } = useCheckout();
  useStepGuard("result");

  useEffect(() => {
    if (session.phase !== "waiting") return;
    const handle = setTimeout(() => dispatch({ type: "reveal" }), REVEAL_MS);
    return () => clearTimeout(handle);
  }, [session.phase, dispatch]);

  if (session.phase === "waiting") {
    return (
      <Screen title="Waiting" testID="waiting-title">
        <Body>{`Fronting ${formatMoney(CART_CENTS)} on one PaySplit card.`}</Body>
      </Screen>
    );
  }

  if (session.phase === "approved" && session.decision?.status === "approved") {
    const decision = session.decision;
    return (
      <Screen
        title="Approved"
        testID="result-title"
        action={{
          label: "Close checkout",
          testID: "close-checkout",
          onPress: () => {
            dispatch({ type: "close" });
            router.replace("/closed");
          },
        }}
      >
        <Body>{`DoorDash was charged ${formatMoney(decision.merchantAuthorization.amountCents)} on one PaySplit card.`}</Body>
        {decision.collections.map((line, index) => (
          <MoneyRow
            key={line.cardId}
            testID={`collection-${index}`}
            label={line.label}
            value={`${formatMoney(line.amountCents)} collected`}
          />
        ))}
        <Body>The merchant authorization was not split.</Body>
      </Screen>
    );
  }

  if (session.phase === "declined" && session.decision?.status === "declined") {
    const decision = session.decision;
    const [first, second] = session.caps;
    const detail = `${cardTitle(first.label, first.last4)} ${formatMoney(decision.capCents[0])} and ${cardTitle(second.label, second.last4)} ${formatMoney(decision.capCents[1])} come to ${formatMoney(decision.capsSumCents)}. The cart is ${formatMoney(decision.cartCents)}. The whole cart was declined. Nothing was collected.`;
    return (
      <Screen
        title="Declined"
        testID="result-title"
        action={{
          label: "Adjust caps",
          testID: "adjust-caps",
          onPress: () => {
            dispatch({ type: "adjust" });
            router.replace("/caps");
          },
        }}
      >
        <Text testID="decline-reason" style={styles.reason}>
          {declineHeadline(decision)}
        </Text>
        <Body>{detail}</Body>
      </Screen>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  reason: {
    fontFamily: systemFont,
    fontSize: 17,
    lineHeight: 24,
    color: ink,
    marginTop: 12,
  },
});
