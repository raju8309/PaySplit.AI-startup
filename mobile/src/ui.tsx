import { useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { accent, ink, line, muted, paper, systemFont, target, white } from "@/theme";

export function Screen({
  title,
  testID,
  children,
  action,
}: {
  title: string;
  testID?: string;
  children: ReactNode;
  action?: { label: string; onPress: () => void; testID: string; disabled?: boolean };
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.frame}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text accessibilityRole="header" testID={testID} style={styles.title}>
          {title}
        </Text>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: Boolean(action.disabled) }}
            disabled={action.disabled}
            onPress={action.onPress}
            testID={action.testID}
            style={({ pressed }) => [
              styles.button,
              Platform.OS === "web" ? styles.buttonWeb : null,
              pressed && !action.disabled ? styles.buttonPressed : null,
              action.disabled ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.buttonText}>{action.label}</Text>
          </Pressable>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Body({ children }: { children: string }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function MoneyRow({
  label,
  value,
  note,
  testID,
}: {
  label: string;
  value: string;
  note?: string;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      accessibilityLabel={note ? `${label}. ${note}. ${value}` : `${label}. ${value}`}
      style={styles.row}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function PaySplitCard({
  amount,
  last4,
  exp,
  active,
  compact,
  testID = "paysplit-card",
}: {
  amount: string;
  last4: string;
  exp: string;
  active: boolean;
  compact?: boolean;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      accessibilityLabel={`PaySplit card ending ${last4}, ${amount}, ${active ? "active" : "inactive"}`}
      style={[styles.plastic, compact ? styles.plasticCompact : null, active ? null : styles.inactive]}
    >
      <Text style={styles.plasticBrand}>PAYSPLIT</Text>
      <Text style={styles.plasticAmount}>{amount}</Text>
      <View style={styles.plasticFoot}>
        <Text style={styles.plasticNumber}>{`····  ····  ····  ${last4}`}</Text>
        <Text style={styles.plasticMeta}>{exp}</Text>
      </View>
    </View>
  );
}

export function DollarField({
  label,
  value,
  onChangeText,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  testID: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="decimal-pad"
        inputMode="decimal"
        autoComplete="off"
        autoCorrect={false}
        autoCapitalize="none"
        placeholder="0.00"
        placeholderTextColor={muted}
        style={[styles.input, focused ? styles.inputFocused : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: paper,
  },
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  title: {
    fontFamily: systemFont,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    color: ink,
    paddingTop: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  body: {
    fontFamily: systemFont,
    fontSize: 17,
    lineHeight: 24,
    color: ink,
    marginTop: 12,
  },
  section: {
    fontFamily: systemFont,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: muted,
    marginTop: 22,
    marginBottom: 8,
  },
  row: {
    minHeight: target,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: line,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: systemFont,
    fontSize: 16,
    lineHeight: 22,
    color: ink,
  },
  rowValue: {
    fontFamily: systemFont,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: ink,
  },
  note: {
    fontFamily: systemFont,
    fontSize: 14,
    lineHeight: 20,
    color: muted,
    marginTop: 2,
  },
  button: {
    minHeight: target,
    borderRadius: 12,
    backgroundColor: accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonWeb: {
    cursor: "pointer",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontFamily: systemFont,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: white,
    textAlign: "center",
  },
  plastic: {
    backgroundColor: accent,
    borderRadius: 16,
    padding: 20,
    minHeight: 168,
    marginTop: 16,
    justifyContent: "space-between",
  },
  plasticCompact: {
    minHeight: 132,
    padding: 16,
  },
  inactive: {
    opacity: 0.45,
  },
  plasticBrand: {
    fontFamily: systemFont,
    color: white,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  plasticAmount: {
    fontFamily: systemFont,
    color: white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    marginTop: 12,
  },
  plasticFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  plasticNumber: {
    fontFamily: systemFont,
    color: white,
    fontSize: 16,
    lineHeight: 22,
  },
  plasticMeta: {
    fontFamily: systemFont,
    color: white,
    fontSize: 16,
    lineHeight: 22,
  },
  field: {
    marginTop: 16,
  },
  fieldLabel: {
    fontFamily: systemFont,
    fontSize: 16,
    lineHeight: 22,
    color: ink,
    marginBottom: 8,
  },
  input: {
    fontFamily: systemFont,
    minHeight: target,
    borderWidth: 1,
    borderColor: line,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    color: ink,
    backgroundColor: white,
  },
  inputFocused: {
    borderColor: accent,
  },
});
