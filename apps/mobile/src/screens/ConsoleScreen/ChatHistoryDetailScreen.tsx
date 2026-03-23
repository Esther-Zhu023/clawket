import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Bot, MessageCircle, User, Wrench } from "lucide-react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { ProBlurOverlay } from "../../components/pro/ProBlurOverlay";
import { EmptyState, LoadingState, SearchInput } from "../../components/ui";
import { useProPaywall } from "../../contexts/ProPaywallContext";
import { useNativeStackModalHeader } from "../../hooks/useNativeStackModalHeader";
import {
  CachedMessage,
  CachedSessionMeta,
  ChatCacheService,
} from "../../services/chat-cache";
import { useAppTheme } from "../../theme";
import { FontSize, FontWeight, Radius, Space } from "../../theme/tokens";
import { splitHighlightSegments } from "../../utils/text-highlight";
import type { ConsoleStackParamList } from "./ConsoleTab";

type Navigation = NativeStackNavigationProp<
  ConsoleStackParamList,
  "ChatHistoryDetail"
>;
type Route = RouteProp<ConsoleStackParamList, "ChatHistoryDetail">;

function formatTime(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function formatDate(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function resolveMessageTimestamp(message: CachedMessage): number | undefined {
  const candidates = [
    message.toolFinishedAt,
    message.toolStartedAt,
    message.timestampMs,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return undefined;
}

function RoleIcon({ role, colors }: { role: string; colors: any }) {
  switch (role) {
    case "user":
      return <User size={14} color={colors.primary} strokeWidth={2} />;
    case "assistant":
      return <Bot size={14} color={colors.success} strokeWidth={2} />;
    case "tool":
      return <Wrench size={14} color={colors.warning} strokeWidth={2} />;
    default:
      return (
        <MessageCircle size={14} color={colors.textSubtle} strokeWidth={2} />
      );
  }
}

function renderHighlightedText(
  text: string,
  query: string,
  colors: { searchHighlightBg: string; text: string },
  keyPrefix: string,
): React.ReactNode[] {
  return splitHighlightSegments(text, query).map((segment, index) => (
    <Text
      key={`${keyPrefix}_${index}`}
      style={
        segment.match
          ? [
              { backgroundColor: colors.searchHighlightBg, color: colors.text },
              styles.highlightInline,
            ]
          : undefined
      }
    >
      {segment.text}
    </Text>
  ));
}

const MessageRow = React.memo(function MessageRow({
  message,
  colors,
  searchQuery,
}: {
  message: CachedMessage;
  colors: any;
  searchQuery: string;
}) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const displayText = isTool
    ? message.toolSummary || message.toolName || "Tool call"
    : message.text;

  return (
    <View
      style={[
        styles.msgRow,
        {
          backgroundColor: isUser ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.msgHeader}>
        <RoleIcon role={message.role} colors={colors} />
        <Text style={[styles.msgRole, { color: colors.textMuted }]}>
          {message.role}
          {isTool && message.toolName ? (
            <>
              {" / "}
              {renderHighlightedText(
                message.toolName,
                searchQuery,
                colors,
                `toolname_${message.id}`,
              )}
            </>
          ) : (
            ""
          )}
        </Text>
        {message.modelLabel && (
          <Text
            style={[styles.msgModel, { color: colors.textSubtle }]}
            numberOfLines={1}
          >
            {message.modelLabel}
          </Text>
        )}
        <Text style={[styles.msgTime, { color: colors.textSubtle }]}>
          {formatTime(resolveMessageTimestamp(message))}
        </Text>
      </View>
      <Text style={[styles.msgText, { color: colors.text }]} selectable>
        {renderHighlightedText(
          displayText,
          searchQuery,
          colors,
          `msg_${message.id}`,
        )}
      </Text>
      {isTool && message.toolStatus && (
        <View style={styles.msgToolStatus}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  message.toolStatus === "success"
                    ? colors.success
                    : message.toolStatus === "error"
                      ? colors.error
                      : colors.warning,
              },
            ]}
          />
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            {message.toolStatus}
          </Text>
        </View>
      )}
    </View>
  );
});

export function ChatHistoryDetailScreen(): React.JSX.Element {
  const { theme } = useAppTheme();
  const { t } = useTranslation("console");
  const { isPro, showPaywall } = useProPaywall();
  const colors = theme.colors;
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { storageKey, initialQuery } = route.params;
  const normalizedInitialQuery = initialQuery?.trim() ?? "";

  const [meta, setMeta] = useState<CachedSessionMeta | null>(null);
  const [messages, setMessages] = useState<CachedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState(normalizedInitialQuery);

  useEffect(() => {
    setSearchText(normalizedInitialQuery);
  }, [normalizedInitialQuery, storageKey]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const allSessions = await ChatCacheService.listSessions();
      const session = allSessions.find((s) => s.storageKey === storageKey);
      if (!active) return;
      setMeta(session ?? null);

      if (session) {
        const msgs = await ChatCacheService.getMessagesByStorageKey(
          session.storageKey,
        );
        if (!active) return;
        setMessages(msgs);
      } else if (active) {
        setMessages([]);
      }
      if (active) {
        setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [storageKey]);

  const filtered = useMemo(() => {
    if (!searchText.trim()) return messages;
    const lower = searchText.toLowerCase();
    return messages.filter(
      (m) =>
        m.text.toLowerCase().includes(lower) ||
        (m.toolName && m.toolName.toLowerCase().includes(lower)) ||
        (m.toolSummary && m.toolSummary.toLowerCase().includes(lower)),
    );
  }, [messages, searchText]);

  const sorted = useMemo(() => {
    const indexed = filtered.map((message, index) => ({ message, index }));
    indexed.sort((a, b) => {
      const aTs = resolveMessageTimestamp(a.message) ?? -1;
      const bTs = resolveMessageTimestamp(b.message) ?? -1;
      if (aTs !== bTs) return bTs - aTs;
      return b.index - a.index;
    });
    return indexed.map((item) => item.message);
  }, [filtered]);

  // Group messages by date
  const sections = useMemo(() => {
    const groups: Array<
      | { type: "date"; date: string }
      | { type: "message"; message: CachedMessage }
    > = [];
    let lastDate = "";
    for (const msg of sorted) {
      const date = formatDate(resolveMessageTimestamp(msg));
      if (date && date !== lastDate) {
        groups.push({ type: "date", date });
        lastDate = date;
      }
      groups.push({ type: "message", message: msg });
    }
    return groups;
  }, [sorted]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof sections)[number] }) => {
      if (item.type === "date") {
        return (
          <View style={styles.dateSeparator}>
            <Text style={[styles.dateText, { color: colors.textSubtle }]}>
              {item.date}
            </Text>
          </View>
        );
      }
      return (
        <MessageRow
          message={item.message}
          colors={colors}
          searchQuery={searchText}
        />
      );
    },
    [colors, searchText],
  );

  const title = meta
    ? meta.agentEmoji
      ? `${meta.agentEmoji} ${meta.agentName || t("common:Agent")}`
      : meta.agentName || t("Messages")
    : t("Messages");

  useNativeStackModalHeader({
    navigation,
    title,
    onClose: () => navigation.goBack(),
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.searchRow}>
        <SearchInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder={t("Filter messages...")}
        />
      </View>

      {/* Stats bar */}
      {meta && (
        <View style={styles.statsRow}>
          <Text style={[styles.statText, { color: colors.textMuted }]}>
            {t("{{count}} messages", { count: meta.messageCount })}
          </Text>
          {meta.firstMessageMs && (
            <Text style={[styles.statText, { color: colors.textSubtle }]}>
              {formatDate(meta.firstMessageMs)} -{" "}
              {formatDate(meta.lastMessageMs)}
            </Text>
          )}
        </View>
      )}

      {loading ? (
        <LoadingState message={t("Loading messages...")} />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item, index) =>
            item.type === "date"
              ? `date_${item.date}`
              : `msg_${item.message.id}_${index}`
          }
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="💬"
              title={searchText ? t("No matching messages") : t("No messages")}
            />
          }
        />
      )}

      {!isPro && (
        <ProBlurOverlay
          description={t("Browse locally cached chat history on this device")}
          onUpgrade={() => showPaywall("messageHistory")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchRow: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    paddingBottom: Space.sm,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Space.lg,
    paddingBottom: Space.sm,
  },
  statText: {
    fontSize: FontSize.sm,
  },
  listContent: {
    paddingHorizontal: Space.lg,
    paddingBottom: Space.xxxl,
  },
  dateSeparator: {
    alignItems: "center",
    paddingVertical: Space.sm,
  },
  dateText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  msgRow: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    padding: Space.md,
    marginBottom: Space.xs,
  },
  msgHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
    marginBottom: Space.xs,
  },
  msgRole: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: "capitalize",
  },
  msgModel: {
    fontSize: FontSize.xs,
    flex: 1,
  },
  msgTime: {
    fontSize: FontSize.xs,
  },
  msgText: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  highlightInline: {
    borderRadius: Radius.sm,
  },
  msgToolStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
    marginTop: Space.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FontSize.xs,
  },
});
