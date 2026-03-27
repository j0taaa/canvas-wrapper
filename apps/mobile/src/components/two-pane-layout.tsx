import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

export function TwoPaneLayout({
  enabled,
  leading,
  trailing,
  containerStyle,
  leadingFlex = 1,
  leadingStyle,
  trailingFlex = 1,
  trailingStyle,
}: {
  enabled: boolean;
  leading: ReactNode;
  trailing: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  leadingFlex?: number;
  leadingStyle?: StyleProp<ViewStyle>;
  trailingFlex?: number;
  trailingStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.container, enabled ? styles.containerEnabled : null, containerStyle]}>
      <View style={[enabled ? styles.pane : null, enabled ? { flex: leadingFlex } : null, leadingStyle]}>
        {leading}
      </View>
      <View style={[enabled ? styles.pane : null, enabled ? { flex: trailingFlex } : null, trailingStyle]}>
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    minHeight: 0,
  },
  containerEnabled: {
    alignItems: "stretch",
    flexDirection: "row",
    flex: 1,
  },
  pane: {
    alignSelf: "stretch",
    minHeight: 0,
    minWidth: 0,
    width: 0,
  },
});
