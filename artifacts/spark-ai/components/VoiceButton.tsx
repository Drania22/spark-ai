import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import React, { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const colors = useColors();
  const [isRecording, setIsRecording] = useState(false);
  const transcriptRef = useRef("");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  };

  useSpeechRecognitionEvent("start", () => {
    setIsRecording(true);
    startPulse();
  });

  useSpeechRecognitionEvent("result", (event) => {
    transcriptRef.current = event.results[0]?.transcript ?? "";
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.error("Speech recognition error:", event.error, event.message);
  });

  // "end" se dispara al detener manualmente o cuando el motor detecta silencio.
  useSpeechRecognitionEvent("end", () => {
    stopPulse();
    setIsRecording(false);
    const text = transcriptRef.current.trim();
    transcriptRef.current = "";
    if (text) {
      onTranscript(text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  });

  const startRecording = async () => {
    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) return;

      transcriptRef.current = "";
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      ExpoSpeechRecognitionModule.start({
        lang: "es-ES",
        interimResults: true,
        continuous: false,
      });
    } catch (err) {
      console.error("Error starting speech recognition:", err);
    }
  };

  const handlePress = () => {
    if (disabled) return;
    if (isRecording) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      ExpoSpeechRecognitionModule.stop();
    } else {
      startRecording();
    }
  };

  const color = isRecording ? "#EA4335" : colors.mutedForeground;

  return (
    <Pressable onPress={handlePress} disabled={disabled} style={styles.wrapper}>
      <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
        {isRecording && (
          <View style={[styles.recordingRing, { borderColor: "#EA4335" }]} />
        )}
        <Feather name="mic" size={20} color={color} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingRing: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 26,
    borderWidth: 2,
    opacity: 0.4,
  },
});
