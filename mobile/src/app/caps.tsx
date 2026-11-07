import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { useCheckout, useStepGuard } from "@/checkout";
import { centsToInput, formatMoney, parseDollars } from "@/money";
import { CART_CENTS, cardTitle } from "@/sample";
import { ink, muted, systemFont } from "@/theme";
import { Body, DollarField, Screen } from "@/ui";

export default function CapsScreen() {
  const { session, dispatch } = useCheckout();
  useStepGuard("caps");
  const [draft, setDraft] = useState([
    centsToInput(session.caps[0].capCents),
    centsToInput(session.caps[1].capCents),
  ]);
  const [error, setError] = useState<string | null>(null);

  const parsed: [number | null, number | null] = [parseDollars(draft[0]), parseDollars(draft[1])];
  const sum = parsed[0] != null && parsed[1] != null ? parsed[0] + parsed[1] : null;

  function save() {
    if (parsed[0] == null || parsed[1] == null) {
      setError("Enter each cap in dollars, such as 15.00.");
      return;
    }
    dispatch({ type: "save", capCents: [parsed[0], parsed[1]] });
    router.push("/card");
  }

  return (
    <Screen
      title="Caps"
      testID="caps-title"
      action={{ label: "Save caps", testID: "save-caps", onPress: save }}
    >
      <Body>{`Set what each card can cover. The cart is ${formatMoney(CART_CENTS)}.`}</Body>
      <DollarField
        label={cardTitle(session.caps[0].label, session.caps[0].last4)}
        value={draft[0]}
        testID="cap-0"
        onChangeText={(next) => {
          setDraft([next, draft[1]]);
          setError(null);
        }}
      />
      <DollarField
        label={cardTitle(session.caps[1].label, session.caps[1].last4)}
        value={draft[1]}
        testID="cap-1"
        onChangeText={(next) => {
          setDraft([draft[0], next]);
          setError(null);
        }}
      />
      <Text style={styles.sum}>
        {sum == null
          ? "Enter both caps in dollars."
          : `Caps sum to ${formatMoney(sum)}. The cart is ${formatMoney(CART_CENTS)}.`}
      </Text>
        {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sum: {
    fontFamily: systemFont,
    fontSize: 16,
    lineHeight: 22,
    color: muted,
    marginTop: 16,
  },
  error: {
    fontFamily: systemFont,
    fontSize: 16,
    lineHeight: 22,
    color: ink,
    marginTop: 8,
  },
});
