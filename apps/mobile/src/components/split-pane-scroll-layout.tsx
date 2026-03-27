import { type ReactElement, type ReactNode } from "react";
import { StyleSheet, View, type RefreshControlProps, type StyleProp, type ViewStyle } from "react-native";
import { TwoPaneLayout } from "./two-pane-layout";
import { RestorableScrollView } from "./restorable-scroll-view";

type PaneConfig = {
  content: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ReactElement<RefreshControlProps>;
  scroll?: boolean;
  storageKey: string;
};

export function SplitPaneScrollLayout({
  enabled,
  leading,
  trailing,
  leadingFlex = 1,
  leadingStyle,
  trailingFlex = 1,
  trailingStyle,
}: {
  enabled: boolean;
  leading: PaneConfig;
  leadingFlex?: number;
  leadingStyle?: StyleProp<ViewStyle>;
  trailing: PaneConfig;
  trailingFlex?: number;
  trailingStyle?: StyleProp<ViewStyle>;
}) {
  const renderPane = (pane: PaneConfig) => {
    if (pane.scroll === false) {
      return <View style={[styles.staticPane, pane.contentContainerStyle]}>{pane.content}</View>;
    }

    return (
      <RestorableScrollView
        nestedScrollEnabled
        storageKey={pane.storageKey}
        style={styles.scrollPane}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={pane.contentContainerStyle}
        refreshControl={pane.refreshControl}
      >
        {pane.content}
      </RestorableScrollView>
    );
  };

  return (
    <TwoPaneLayout
      enabled={enabled}
      leading={renderPane(leading)}
      leadingFlex={leadingFlex}
      leadingStyle={[styles.pane, leadingStyle]}
      trailing={renderPane(trailing)}
      trailingFlex={trailingFlex}
      trailingStyle={[styles.pane, trailingStyle]}
    />
  );
}

const styles = StyleSheet.create({
  pane: {
    alignSelf: "stretch",
    minHeight: 0,
  },
  scrollPane: {
    flex: 1,
    minHeight: 0,
  },
  staticPane: {
    flex: 1,
    minHeight: 0,
  },
});
