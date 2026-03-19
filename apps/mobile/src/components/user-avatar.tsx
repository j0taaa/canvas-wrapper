import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export function UserAvatar({
  backgroundColor,
  borderColor,
  fallback,
  name,
  size,
  src,
  textColor,
  textSize,
}: {
  backgroundColor: string;
  borderColor: string;
  fallback: string;
  name: string;
  size: number;
  src?: string | null;
  textColor: string;
  textSize: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor,
          borderColor,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      {src && !imageFailed ? (
        <Image
          accessibilityLabel={name}
          onError={() => setImageFailed(true)}
          source={{ uri: src }}
          style={[
            styles.image,
            {
              borderRadius: size / 2,
              height: size,
              width: size,
            },
          ]}
        />
      ) : (
        <Text style={[styles.fallbackText, { color: textColor, fontSize: textSize }]}>{fallback}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  fallbackText: {
    fontWeight: "600",
  },
  image: {
    resizeMode: "cover",
  },
});
