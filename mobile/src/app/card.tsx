import { useRef } from "react";
import { router } from "expo-router";

import { useCheckout, useStepGuard } from "@/checkout";
import { formatMoney } from "@/money";
import { CART_CENTS, order, paysplitCard } from "@/sample";
import { Body, PaySplitCard, Screen } from "@/ui";

export default function CardScreen() {
  const { session, dispatch } = useCheckout();
  useStepGuard("card");
  const sent = useRef(false);

  if (session.phase !== "open") return null;

  return (
    <Screen
      title="Card"
      testID="card-title"
      action={{
        label: `Charge ${formatMoney(CART_CENTS)}`,
        testID: "charge-card",
        onPress: () => {
          if (sent.current) return;
          sent.current = true;
          dispatch({ type: "charge" });
          router.replace("/result");
        },
      }}
    >
      <Body>{`${order.place} on ${order.merchant} would charge this one card.`}</Body>
      <PaySplitCard
        amount={formatMoney(CART_CENTS)}
        last4={paysplitCard.last4}
        exp={paysplitCard.exp}
        active={session.paysplitActive}
      />
      <Body>The merchant authorization is not split.</Body>
      <Body>Sample only. No bank, issuer, or card is charged.</Body>
    </Screen>
  );
}
