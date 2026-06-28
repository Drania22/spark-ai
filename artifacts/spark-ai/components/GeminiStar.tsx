import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

interface GeminiStarProps {
  size?: number;
  animated?: boolean;
}

export function GeminiStar({ size = 40, animated = false }: GeminiStarProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, pulseAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          <LinearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4285F4" />
            <Stop offset="33%" stopColor="#EA4335" />
            <Stop offset="66%" stopColor="#FBBC04" />
            <Stop offset="100%" stopColor="#34A853" />
          </LinearGradient>
        </Defs>
        <Path
          d="M20 2 C20 2 21.5 11 26 15.5 C30.5 20 38 20 38 20 C38 20 30.5 20 26 24.5 C21.5 29 20 38 20 38 C20 38 18.5 29 14 24.5 C9.5 20 2 20 2 20 C2 20 9.5 20 14 15.5 C18.5 11 20 2 20 2Z"
          fill="url(#grad1)"
        />
      </Svg>
    </Animated.View>
  );
}

export function GeminiStarSmall({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4285F4" />
          <Stop offset="33%" stopColor="#EA4335" />
          <Stop offset="66%" stopColor="#FBBC04" />
          <Stop offset="100%" stopColor="#34A853" />
        </LinearGradient>
      </Defs>
      <Path
        d="M20 2 C20 2 21.5 11 26 15.5 C30.5 20 38 20 38 20 C38 20 30.5 20 26 24.5 C21.5 29 20 38 20 38 C20 38 18.5 29 14 24.5 C9.5 20 2 20 2 20 C2 20 9.5 20 14 15.5 C18.5 11 20 2 20 2Z"
        fill="url(#grad2)"
      />
    </Svg>
  );
}
