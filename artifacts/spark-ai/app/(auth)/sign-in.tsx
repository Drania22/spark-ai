import { useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

function AnimatedStar() {
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotate, { toValue: 1, duration: 8000, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={{ transform: [{ scale }, { rotate: spin }] }}>
      <Svg width={80} height={80} viewBox="0 0 40 40">
        <Defs>
          <LinearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4285F4" />
            <Stop offset="33%" stopColor="#EA4335" />
            <Stop offset="66%" stopColor="#FBBC04" />
            <Stop offset="100%" stopColor="#34A853" />
          </LinearGradient>
        </Defs>
        <Path
          d="M20 2C20 2 21.5 11 26 15.5C30.5 20 38 20 38 20C38 20 30.5 20 26 24.5C21.5 29 20 38 20 38C20 38 18.5 29 14 24.5C9.5 20 2 20 2 20C2 20 9.5 20 14 15.5C18.5 11 20 2 20 2Z"
          fill="url(#g)"
        />
      </Svg>
    </Animated.View>
  );
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: async ({ decorateUrl }) => {
            router.replace(decorateUrl("/") as any);
          },
        });
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
    }
  }, [startSSOFlow, router]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Background gradient blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <AnimatedStar />
          <Text style={styles.appName}>Spark</Text>
          <Text style={styles.tagline}>Tu asistente de IA personal</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {[
            { emoji: "⚡", text: "Respuestas instantáneas con IA" },
            { emoji: "🔒", text: "Conversaciones privadas y seguras" },
            { emoji: "📱", text: "Sincroniza en todos tus dispositivos" },
          ].map(({ emoji, text }) => (
            <View key={text} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{emoji}</Text>
              <Text style={styles.featureText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Sign-in buttons */}
        <View style={styles.authSection}>
          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleGoogleSignIn}
          >
            {/* Google G icon */}
            <Svg width={20} height={20} viewBox="0 0 48 48">
              <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <Path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </Svg>
            <Text style={styles.googleButtonText}>Continuar con Google</Text>
          </Pressable>

          <Text style={styles.terms}>
            Al continuar, aceptas los{" "}
            <Text style={styles.termsLink}>Términos de servicio</Text>
            {" "}y la{" "}
            <Text style={styles.termsLink}>Política de privacidad</Text>
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    top: -100,
    left: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: "rgba(66, 133, 244, 0.12)",
  },
  blob2: {
    position: "absolute",
    bottom: 100,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(52, 168, 83, 0.08)",
  },
  blob3: {
    position: "absolute",
    bottom: -50,
    left: 50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(234, 67, 53, 0.08)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: "center",
    paddingTop: 60,
    gap: 16,
  },
  appName: {
    fontSize: 42,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  featuresSection: {
    gap: 20,
    paddingHorizontal: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  authSection: {
    gap: 16,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 24,
  },
  googleButtonText: {
    fontSize: 16,
    color: "#1a1a1a",
    fontFamily: "Inter_600SemiBold",
  },
  terms: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  termsLink: {
    color: "rgba(255,255,255,0.55)",
    textDecorationLine: "underline",
  },
});
