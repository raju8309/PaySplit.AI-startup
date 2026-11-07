import { router } from "expo-router";

import { useCheckout, useStepGuard } from "@/checkout";
import { formatMoney } from "@/money";
import { cardTitle, paysplitCard } from "@/sample";
import { Body, MoneyRow, Screen } from "@/ui";

export default function ClosedScreen() {
  const { session, dispatch } = useCheckout();
  useStepGuard("closed");

  if (session.phase !== "closed" || session.decision?.status !== "approved") return null;

  return (
    <Screen
      title="Closed"
      testID="closed-title"
      action={{
        label: "Done",
        testID: "done",
        onPress: () => {
          dispatch({ type: "done" });
          router.replace("/");
        },
      }}
    >
      <Body>Both pulls are settled. These cards are no longer active.</Body>
      {session.decision.collections.map((line, index) => (
        <MoneyRow
          key={line.cardId}
          testID={`settled-${index}`}
          label={line.label}
          value={`${formatMoney(line.amountCents)} settled`}
          note="Inactive"
        />
      ))}
      <MoneyRow
        testID="paysplit-inactive"
        label={cardTitle(paysplitCard.label, paysplitCard.last4)}
        value="Inactive"
      />
    </Screen>
  );
}
