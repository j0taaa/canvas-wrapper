import { useEffect, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

export function UserAvatar({
  backgroundColor,
  borderColor,
  expandable = false,
  fallback,
  name,
  size,
  src,
  textColor,
  textSize,
}: {
  backgroundColor: string;
  borderColor: string;
  expandable?: boolean;
  fallback: string;
  name: string;
  size: number;
  src?: string | null;
  textColor: string;
  textSize: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const expandedImageStyle = {
    height: Math.min(windowHeight * 0.88, 720),
    width: Math.min(windowWidth * 0.96, 960),
  } as const;
  const expandedFallbackSize = Math.min(windowWidth * 0.76, windowHeight * 0.84, 320);

  const avatarContent = (
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

  if (!expandable) {
    return avatarContent;
  }

  return (
    <>
      <Pressable
        accessibilityLabel={`Expand ${name} profile picture`}
        accessibilityRole="button"
        onPress={() => setIsExpanded(true)}
        style={styles.trigger}
      >
        {avatarContent}
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsExpanded(false)}
        transparent
        visible={isExpanded}
      >
        <Pressable
          accessibilityLabel="Close expanded profile picture"
          accessibilityRole="button"
          onPress={() => setIsExpanded(false)}
          style={styles.overlay}
        >
          <View style={styles.expandedContainer}>
            {src && !imageFailed ? (
              <Image
                accessibilityLabel={name}
                onError={() => setImageFailed(true)}
                source={{ uri: src }}
                style={[styles.expandedImage, expandedImageStyle]}
              />
            ) : (
              <View
                style={[
                  styles.expandedFallback,
                  {
                    borderRadius: Math.max(24, expandedFallbackSize / 6),
                    height: expandedFallbackSize,
                    width: expandedFallbackSize,
                  },
                ]}
              >
                <Text style={styles.expandedFallbackText}>{fallback}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
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
  trigger: {
    borderRadius: 999,
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.88)",
    flex: 1,
    justifyContent: "center",
    padding: 12,
  },
  expandedContainer: {
    alignItems: "center",
    justifyContent: "center",
    maxHeight: "100%",
    maxWidth: "100%",
  },
  expandedImage: {
    borderRadius: 40,
    resizeMode: "contain",
  },
  expandedFallback: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    justifyContent: "center",
  },
  expandedFallbackText: {
    color: "#ffffff",
    fontSize: 84,
    fontWeight: "600",
  },
});
