import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { GeminiStarSmall } from "@/components/GeminiStar";
import { useColors } from "@/hooks/useColors";
import type { Message } from "@/context/ChatContext";

interface ChatBubbleProps {
  message: Message;
  isLast: boolean;
}

export function ChatBubble({ message, isLast }: ChatBubbleProps) {
  const colors = useColors();
  const isUser = message.role === "user";

  return (
    <Animated.View
      entering={FadeInDown.duration(250).springify()}
      style={[styles.row, isUser ? styles.rowUser : styles.rowAI]}
    >
      {!isUser && (
        <View style={styles.avatarContainer}>
          <GeminiStarSmall size={18} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.userBubble }]
            : [styles.aiBubble, { backgroundColor: colors.aiBubble }],
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: isUser ? colors.userBubbleText : colors.aiBubbleText },
          ]}
        >
          {message.content}
          {message.isStreaming && (
            <Text style={[styles.cursor, { color: colors.primary }]}>▋</Text>
          )}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 4,
    paddingHorizontal: 12,
    alignItems: "flex-end",
    gap: 8,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAI: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    borderBottomLeftRadius: 6,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  cursor: {
    fontSize: 15,
  },
});
