import { useAuth, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useChat } from "@/context/ChatContext";
import { useColors } from "@/hooks/useColors";

const DRAWER_WIDTH = Dimensions.get("window").width * 0.82;

export function Drawer() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const {
    conversations,
    activeConversation,
    selectConversation,
    deleteConversation,
    clearActiveConversation,
    drawerOpen,
    setDrawerOpen,
  } = useChat();

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: drawerOpen ? 0 : -DRAWER_WIDTH,
        tension: 80,
        friction: 14,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: drawerOpen ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerOpen]);

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!drawerOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setDrawerOpen(false)} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.card,
            borderRightColor: colors.border,
            transform: [{ translateX: slideAnim }],
            paddingTop: topPad,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.userInfo}>
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarInitial}>
                  {(user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0] ?? "U").toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userTexts}>
              <Text style={[styles.userName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                {user?.firstName ?? "Usuario"}
              </Text>
              <Text style={[styles.userEmail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                {user?.emailAddresses?.[0]?.emailAddress ?? ""}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              setDrawerOpen(false);
              clearActiveConversation();
            }}
            style={[styles.newChatBtn, { backgroundColor: colors.accent }]}
          >
            <Feather name="edit-2" size={16} color={colors.primary} />
          </Pressable>
        </View>

        {/* Conversations */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          CONVERSACIONES
        </Text>

        <ScrollView style={styles.conversationList} showsVerticalScrollIndicator={false}>
          {conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Sin conversaciones aún
              </Text>
            </View>
          ) : (
            conversations.map((conv) => {
              const isActive = activeConversation?.id === conv.id;
              return (
                <Pressable
                  key={conv.id}
                  style={[
                    styles.convItem,
                    isActive && { backgroundColor: colors.accent },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    selectConversation(conv.id);
                  }}
                >
                  <Feather name="message-circle" size={16} color={isActive ? colors.primary : colors.mutedForeground} />
                  <Text
                    style={[
                      styles.convTitle,
                      {
                        color: isActive ? colors.foreground : colors.foreground,
                        fontFamily: isActive ? "Inter_500Medium" : "Inter_400Regular",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {conv.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      deleteConversation(conv.id);
                    }}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
          <Pressable style={styles.footerBtn} onPress={handleSignOut}>
            <Feather name="log-out" size={18} color={colors.mutedForeground} />
            <Text style={[styles.footerBtnText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Cerrar sesión
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 16,
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  userTexts: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
  },
  userEmail: {
    fontSize: 12,
  },
  newChatBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  conversationList: {
    flex: 1,
    paddingHorizontal: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 2,
  },
  convTitle: {
    flex: 1,
    fontSize: 14,
  },
  deleteBtn: {
    padding: 4,
  },
  drawerFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  footerBtnText: {
    fontSize: 15,
  },
});
