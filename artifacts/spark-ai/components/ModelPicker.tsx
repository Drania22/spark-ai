import React, { useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useChat, MODELS } from "@/context/ChatContext";

export function ModelPicker() {
  const colors = useColors();
  const { selectedModel, setSelectedModel } = useChat();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const current = MODELS.find((m) => m.id === selectedModel) ?? MODELS[0];
  const isOffline = current.offline;

  return (
    <>
      <Pressable
        style={[
          styles.trigger,
          {
            borderColor: isOffline ? "rgba(251,188,4,0.4)" : colors.border,
            backgroundColor: isOffline ? "rgba(251,188,4,0.08)" : "transparent",
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setOpen(true);
        }}
      >
        <Text style={styles.triggerIcon}>{current.icon}</Text>
        <Text
          style={[
            styles.triggerText,
            { color: colors.foreground, fontFamily: "Inter_500Medium" },
          ]}
        >
          {current.label}
        </Text>
        <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
      </Pressable>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                bottom: insets.bottom + 20,
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text
              style={[
                styles.sheetTitle,
                { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
              ]}
            >
              Seleccionar modelo
            </Text>

            {MODELS.map((m) => {
              const isSelected = selectedModel === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={[
                    styles.modelOption,
                    isSelected && { backgroundColor: colors.accent },
                    m.offline && !isSelected && { opacity: 0.8 },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedModel(m.id);
                    setOpen(false);
                  }}
                >
                  <View
                    style={[
                      styles.modelIconBox,
                      {
                        backgroundColor: m.offline
                          ? "rgba(251,188,4,0.12)"
                          : isSelected
                          ? colors.accent
                          : colors.muted,
                      },
                    ]}
                  >
                    <Text style={styles.modelIcon}>{m.icon}</Text>
                  </View>
                  <View style={styles.modelTexts}>
                    <Text
                      style={[
                        styles.modelLabel,
                        {
                          color: colors.foreground,
                          fontFamily: "Inter_600SemiBold",
                        },
                      ]}
                    >
                      {m.label}
                    </Text>
                    <Text
                      style={[
                        styles.modelSublabel,
                        {
                          color: colors.mutedForeground,
                          fontFamily: "Inter_400Regular",
                        },
                      ]}
                    >
                      {m.sublabel}
                    </Text>
                  </View>
                  {isSelected && (
                    <Feather name="check-circle" size={20} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  triggerIcon: {
    fontSize: 14,
  },
  triggerText: {
    fontSize: 14,
    maxWidth: 130,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    marginHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1,
    padding: 12,
    paddingTop: 8,
    marginBottom: 8,
    overflow: "hidden",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  modelOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 12,
    marginBottom: 4,
  },
  modelIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modelIcon: {
    fontSize: 20,
  },
  modelTexts: {
    flex: 1,
  },
  modelLabel: {
    fontSize: 15,
  },
  modelSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
});
