import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { VoiceButton } from "@/components/VoiceButton";

interface ChatInputProps {
  onSend: (text: string, images?: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Pregunta a Spark",
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && images.length === 0) || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed, images.length > 0 ? images : undefined);
    setText("");
    setImages([]);
  };

  const handleVoiceTranscript = (transcript: string) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    inputRef.current?.focus();
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: false,
      selectionLimit: 4,
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 4));
    }
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((u) => u !== uri));
  };

  const canSend = (text.trim().length > 0 || images.length > 0) && !disabled;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: images.length > 0 ? "transparent" : colors.border,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      {/* Image previews */}
      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imageScrollView}
          contentContainerStyle={styles.imageRow}
        >
          {images.map((uri) => (
            <View key={uri} style={styles.imagePreviewWrapper}>
              <Image source={{ uri }} style={styles.imagePreview} />
              <Pressable
                style={[styles.removeImageBtn, { backgroundColor: colors.card }]}
                onPress={() => removeImage(uri)}
              >
                <Feather name="x" size={12} color={colors.foreground} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {/* + button for file picker */}
        <Pressable style={styles.actionButton} onPress={handlePickImage} disabled={disabled}>
          <Feather name="plus" size={22} color={colors.mutedForeground} />
        </Pressable>

        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { color: colors.foreground, fontFamily: "Inter_400Regular" },
          ]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={4000}
          onSubmitEditing={Platform.OS === "web" ? handleSend : undefined}
          blurOnSubmit={false}
          returnKeyType="send"
        />

        {/* Voice button */}
        {Platform.OS !== "web" && !canSend && (
          <VoiceButton onTranscript={handleVoiceTranscript} disabled={disabled} />
        )}

        {/* Send button */}
        {canSend && (
          <Pressable
            style={[styles.sendButton, { backgroundColor: colors.primary }]}
            onPress={handleSend}
          >
            <Feather name="arrow-up" size={18} color="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  imageScrollView: {
    marginBottom: 8,
    marginLeft: -12,
    marginRight: -12,
  },
  imageRow: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: "row",
  },
  imagePreviewWrapper: {
    position: "relative",
  },
  imagePreview: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 28,
    borderWidth: 1,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 4,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 120,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
