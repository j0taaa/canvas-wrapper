import { useFocusEffect, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useRef } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  type ScrollViewProps,
} from "react-native";

const routeScrollOffsets = new Map<string, number>();

function runScrollHandler(
  handler: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined,
  event: NativeSyntheticEvent<NativeScrollEvent>,
) {
  handler?.(event);
}

export function RestorableScrollView({
  onContentSizeChange,
  onMomentumScrollEnd,
  onScroll,
  onScrollEndDrag,
  scrollEventThrottle = 16,
  ...props
}: ScrollViewProps) {
  const route = useRoute();
  const scrollRef = useRef<ScrollView>(null);
  const lastOffsetRef = useRef(routeScrollOffsets.get(route.key) ?? 0);
  const pendingRestoreRef = useRef(false);

  const saveOffset = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextOffset = event.nativeEvent.contentOffset.y;
      lastOffsetRef.current = nextOffset;
      routeScrollOffsets.set(route.key, nextOffset);
    },
    [route.key],
  );

  const restoreOffset = useCallback(() => {
    if (!pendingRestoreRef.current) {
      return;
    }

    pendingRestoreRef.current = false;
    const savedOffset = routeScrollOffsets.get(route.key) ?? 0;

    if (savedOffset <= 0) {
      return;
    }

    scrollRef.current?.scrollTo({ animated: false, y: savedOffset });
  }, [route.key]);

  useFocusEffect(
    useCallback(() => {
      pendingRestoreRef.current = true;
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          restoreOffset();
        });
      });

      return () => {
        pendingRestoreRef.current = false;
        cancelAnimationFrame(frame);
        routeScrollOffsets.set(route.key, lastOffsetRef.current);
      };
    }, [restoreOffset, route.key]),
  );

  useEffect(
    () => () => {
      routeScrollOffsets.set(route.key, lastOffsetRef.current);
    },
    [route.key],
  );

  return (
    <ScrollView
      {...props}
      ref={scrollRef}
      onContentSizeChange={(width, height) => {
        onContentSizeChange?.(width, height);

        if (pendingRestoreRef.current) {
          requestAnimationFrame(() => {
            restoreOffset();
          });
        }
      }}
      onMomentumScrollEnd={(event) => {
        saveOffset(event);
        runScrollHandler(onMomentumScrollEnd, event);
      }}
      onScroll={(event) => {
        saveOffset(event);
        runScrollHandler(onScroll, event);
      }}
      onScrollEndDrag={(event) => {
        saveOffset(event);
        runScrollHandler(onScrollEndDrag, event);
      }}
      scrollEventThrottle={scrollEventThrottle}
    />
  );
}
