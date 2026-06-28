import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { fetch } from "expo/fetch";
import { getOfflineResponse } from "@/utils/offlineAI";

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
}

export const MODELS = [
  {
    id: "gemini-2.5-flash",
    label: "Spark 3.5 Flash",
    sublabel: "Respuestas rápidas e inteligentes",
    icon: "⚡",
    offline: false,
  },
  {
    id: "gemini-2.5-pro",
    label: "Spark 3.1 Pro",
    sublabel: "Razonamiento avanzado y profundo",
    icon: "🧠",
    offline: false,
  },
  {
    id: "offline",
    label: "Spark Offline",
    sublabel: "Sin internet, respuestas básicas",
    icon: "📡",
    offline: true,
  },
];

const DEFAULT_MODEL = "gemini-2.5-flash";
const STORAGE_KEY = "spark_conversations_v2";
const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  isStreaming: boolean;
  selectedModel: string;
  models: typeof MODELS;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  setSelectedModel: (model: string) => void;
  createConversation: () => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  sendMessage: (text: string) => Promise<void>;
  clearActiveConversation: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const streamingContentRef = useRef<string>("");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Conversation[];
          setConversations(parsed);
        } catch {}
      }
    });
  }, []);

  const saveConversations = useCallback((convs: Conversation[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
  }, []);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;

  const createConversation = useCallback(() => {
    const id = generateId();
    const conv: Conversation = {
      id,
      title: "Nueva conversación",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel,
    };
    setConversations((prev) => {
      const next = [conv, ...prev];
      saveConversations(next);
      return next;
    });
    setActiveConversationId(id);
    return id;
  }, [selectedModel, saveConversations]);

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setDrawerOpen(false);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        saveConversations(next);
        return next;
      });
      setActiveConversationId((prev) => (prev === id ? null : prev));
    },
    [saveConversations]
  );

  const clearActiveConversation = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string, images?: string[]) => {
      let convId = activeConversationId;
      let currentConvs = conversations;

      if (!convId) {
        const id = generateId();
        const conv: Conversation = {
          id,
          title: text.slice(0, 45) || "Nueva conversación",
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          model: selectedModel,
        };
        currentConvs = [conv, ...conversations];
        setConversations(currentConvs);
        saveConversations(currentConvs);
        setActiveConversationId(id);
        convId = id;
      }

      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: images && images.length > 0
          ? `${text}${text ? "\n" : ""}[${images.length} imagen${images.length > 1 ? "es" : ""} adjunta${images.length > 1 ? "s" : ""}]`
          : text,
        timestamp: Date.now(),
      };
      const assistantMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          return {
            ...c,
            messages: [...c.messages, userMsg, assistantMsg],
            title: c.messages.length === 0 ? text.slice(0, 45) : c.title,
            updatedAt: Date.now(),
          };
        })
      );

      setIsStreaming(true);
      streamingContentRef.current = "";

      // Offline model - no API call
      const currentModel = MODELS.find((m) => m.id === selectedModel);
      if (currentModel?.offline) {
        await new Promise((r) => setTimeout(r, 600));
        const response = getOfflineResponse(text);
        streamingContentRef.current = response;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: response, isStreaming: false }
                  : m
              ),
              updatedAt: Date.now(),
            };
          })
        );
        setIsStreaming(false);
        setConversations((prev) => {
          saveConversations(prev);
          return prev;
        });
        return;
      }

      // Online models - streaming API
      try {
        const history = currentConvs
          .find((c) => c.id === convId)
          ?.messages.map((m) => ({ role: m.role, content: m.content })) ?? [];

        // Convert local image URIs to base64 for API
        let imageData: string[] | undefined;
        if (images && images.length > 0) {
          imageData = await Promise.all(
            images.map(async (uri) => {
              const r = await fetch(uri);
              const blob = await r.blob();
              return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            })
          );
        }

        const response = await fetch(`${API_BASE}/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history, model: selectedModel, images: imageData }),
        });

        if (!response.ok || !response.body) throw new Error("Stream failed");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  streamingContentRef.current += parsed.content;
                  const captured = streamingContentRef.current;
                  setConversations((prev) =>
                    prev.map((c) => {
                      if (c.id !== convId) return c;
                      return {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantMsg.id
                            ? { ...m, content: captured }
                            : m
                        ),
                      };
                    })
                  );
                }
              } catch {}
            }
          }
        }
      } catch {
        const errMsg =
          "Lo siento, hubo un error al conectar. Por favor, verifica tu conexión e intenta de nuevo.";
        streamingContentRef.current = errMsg;
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: errMsg, isStreaming: false }
                  : m
              ),
            };
          })
        );
      } finally {
        setIsStreaming(false);
        setConversations((prev) => {
          const next = prev.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      isStreaming: false,
                      content:
                        streamingContentRef.current || m.content,
                    }
                  : m
              ),
              updatedAt: Date.now(),
            };
          });
          saveConversations(next);
          return next;
        });
      }
    },
    [activeConversationId, conversations, selectedModel, saveConversations]
  );

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        isStreaming,
        selectedModel,
        models: MODELS,
        drawerOpen,
        setDrawerOpen,
        setSelectedModel,
        createConversation,
        selectConversation,
        deleteConversation,
        sendMessage,
        clearActiveConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
