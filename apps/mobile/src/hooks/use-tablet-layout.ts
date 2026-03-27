import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

const TABLET_MIN_SMALLEST_DIMENSION = 700;
const TABLET_MIN_LARGEST_DIMENSION = 900;

export function useTabletLayout() {
  const { height, width } = useWindowDimensions();

  return useMemo(() => {
    const smallestDimension = Math.min(width, height);
    const largestDimension = Math.max(width, height);
    const isLandscape = width > height;
    const isTablet =
      smallestDimension >= TABLET_MIN_SMALLEST_DIMENSION &&
      largestDimension >= TABLET_MIN_LARGEST_DIMENSION;

    return {
      height,
      isLandscape,
      isTablet,
      isTabletLandscape: isTablet && isLandscape,
      width,
    };
  }, [height, width]);
}
