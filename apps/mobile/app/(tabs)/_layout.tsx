import { Stack } from "expo-router";
import { View } from "react-native";

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, paddingTop: 16 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="inbox" />
        <Stack.Screen name="bookmarks" />
        <Stack.Screen name="profile" />
      </Stack>
    </View>
  );
}
