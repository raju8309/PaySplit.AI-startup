import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useCheckout, CheckoutProvider } from "@/checkout";
import { paper } from "@/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <CheckoutProvider>
        <CheckoutStack />
      </CheckoutProvider>
    </SafeAreaProvider>
  );
}

function CheckoutStack() {
  const { session } = useCheckout();
  return (
    <Stack
      key={session.phase === "empty" ? "empty" : "active"}
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: "fade",
        contentStyle: { backgroundColor: paper },
      }}
    />
  );
}
