import { useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useChat } from "@/context/ChatContext";
import { GeminiStar } from "@/components/GeminiStar";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatInput } from "@/components/ChatInput";
import { ModelPicker } from "@/components/ModelPicker";
import { Drawer } from "@/components/Drawer";

const SUGGESTIONS = [
  { text: "Explícame la inteligencia artificial", icon: "cpu" },
  { text: "Escribe un poema sobre el mar", icon: "feather" },
  { text: "Ideas para un proyecto creativo", icon: "zap" },
  { text: "¿Cuál es el sentido de la vida?", icon: "help-circle" },
];

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const {
    activeConversation,
    isStreaming,
    sendMessage,
    clearActiveConversation,
    drawerOpen,
    setDrawerOpen,
    selectedModel,
  } = useChat();

  const flatListRef = useRef<FlatList>(null);
  const messages = activeConversation?.messages ?? [];
  const firstName = user?.firstName ?? "Usuario";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleSend = (text: string, images?: string[]) => {
    sendMessage(text, images);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: messages.length > 0 ? colors.border : "transparent",
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setDrawerOpen(true);
          }}
          style={styles.iconBtn}
        >
          <Feather name="menu" size={22} color={colors.foreground} />
        </Pressable>

        <ModelPicker />

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            clearActiveConversation();
          }}
          style={styles.iconBtn}
        >
          <Feather name="edit-2" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={styles.emptyContainer}
          >
            <GeminiStar size={60} animated />
            <Text
              style={[
                styles.greeting,
                { color: colors.foreground, fontFamily: "Inter_500Medium" },
              ]}
            >
              ¡Hola, {firstName}!
            </Text>
            <Text
              style={[
                styles.greetingSub,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              ¿En qué puedo ayudarte hoy?
            </Text>

            <View style={styles.suggestionsGrid}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s.text}
                  style={[
                    styles.suggestionCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    sendMessage(s.text);
                  }}
                >
                  <Feather name={s.icon as any} size={18} color={colors.primary} style={styles.suggestionIcon} />
                  <Text
                    style={[
                      styles.suggestionText,
                      { color: colors.foreground, fontFamily: "Inter_400Regular" },
                    ]}
                    numberOfLines={2}
                  >
                    {s.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...messages].reverse()}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <ChatBubble message={item} isLast={index === 0} />
            )}
            inverted
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}

        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder={selectedModel === "offline" ? "Pregunta sin internet..." : "Pregunta a Spark"}
        />
      </KeyboardAvoidingView>

      {/* Drawer overlay */}
      <Drawer />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 8,
  },
  greeting: { fontSize: 28, marginTop: 12 },
  greetingSub: { fontSize: 16, marginBottom: 20 },
  suggestionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    width: "100%",
  },
  suggestionCard: {
    width: "46%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    minHeight: 80,
    justifyContent: "space-between",
  },
  suggestionIcon: { marginBottom: 8 },
  suggestionText: { fontSize: 13, lineHeight: 18 },
  messageList: { paddingVertical: 12 },
});
