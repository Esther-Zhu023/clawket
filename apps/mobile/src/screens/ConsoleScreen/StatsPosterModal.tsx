import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Download, RefreshCw, Share2, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { FontWeight, Radius, Space } from '../../theme/tokens';
import { useAppTheme } from '../../theme';
import { PosterThemePicker } from '../../components/poster/PosterThemePicker';
import { getPosterThemeForAccent, pickRandom } from '../../components/poster/posterThemes';
import { getDisplayAgentEmoji } from '../../utils/agent-emoji';

// ---- Types ----

export type DashboardData = {
  agentName: string;
  agentEmoji: string;
  cost: string | null;
  tokens: string | null;
  channels: number | null;
  cronTotal: number | null;
  cronFailed: number | null;
  skills: number | null;
  models: number | null;
  sessions: number | null;
  files: number | null;
  messages: number | null;
  userMessages: number | null;
  toolCalls: number | null;
  lastHeartbeat: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  data: DashboardData;
  agentAvatarUri?: string;
};

// ---- Poster Colors ----

const C = {
  bg: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  textBody: '#3A3A3C',
  cardBg: '#F5F5F7',
  // Modal chrome (buttons outside poster, on dark backdrop)
  chromeText: '#FFFFFF',
  chromeTextSecondary: 'rgba(255,255,255,0.5)',
};

// ---- Helpers ----

function formatDate(locale: string): string {
  const d = new Date();
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCost(cost: string | null): string {
  if (cost == null) return '$ —';
  const n = parseFloat(cost);
  if (isNaN(n)) return '$' + cost;
  if (n >= 100) return '$' + Math.round(n);
  if (n >= 10) return '$' + n.toFixed(1);
  return '$' + n.toFixed(2);
}

// ---- Component ----

export function StatsPosterModal({ visible, onClose, data, agentAvatarUri }: Props) {
  const { t, i18n } = useTranslation('console');
  const { accentId } = useAppTheme();
  const posterRef = useRef<View>(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [theme, setTheme] = useState(() => getPosterThemeForAccent(accentId));
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const taglines = useMemo<Array<(d: DashboardData) => string>>(() => [
    (d) => t('My agent burned {{cost}} today and I regret nothing 🔥', { cost: formatCost(d.cost) }),
    (d) => t('{{toolCalls}} tool calls. She\'s been busy.', { toolCalls: d.toolCalls ?? 0 }),
    (d) => t('{{messages}} messages deep. Basically besties now.', { messages: d.messages ?? 0 }),
    (d) => t('{{cost}} well spent. My agent works harder than me.', { cost: formatCost(d.cost) }),
    (d) => t('{{tokens}} tokens consumed. The machine is hungry.', { tokens: d.tokens ?? '—' }),
    (d) => t('My agent had {{toolCalls}} tool calls before I had breakfast ☕', { toolCalls: d.toolCalls ?? 0 }),
    (d) => t('{{cost}} on AI today. An investment in laziness.', { cost: formatCost(d.cost) }),
    (d) => t('{{messages}} messages in and still going strong 💪', { messages: d.messages ?? 0 }),
    (d) => t('Another {{cost}} day in the AI trenches.', { cost: formatCost(d.cost) }),
    (d) => t('{{toolCalls}} tools called. Not a single regret.', { toolCalls: d.toolCalls ?? 0 }),
    (d) => t('She spoke {{messages}} times today. I only spoke 12.', { messages: d.messages ?? 0 }),
    (d) => t('My agent\'s daily burn: {{cost}}. My coffee: $6. Priorities.', { cost: formatCost(d.cost) }),
    (d) => t('{{tokens}} tokens go brrrr 🌀', { tokens: d.tokens ?? '—' }),
    (d) => t('{{messages}} messages. {{toolCalls}} tool calls. 0 complaints.', {
      messages: d.messages ?? 0,
      toolCalls: d.toolCalls ?? 0,
    }),
    (d) => t('I asked once. She called {{toolCalls}} tools to figure it out.', { toolCalls: d.toolCalls ?? 0 }),
    (d) => t('Running hot at {{cost}}. Worth every token. 🐾', { cost: formatCost(d.cost) }),
  ], [t]);
  const [tagline, setTagline] = useState(() => pickRandom(taglines));

  useEffect(() => {
    setTagline(() => pickRandom(taglines));
  }, [taglines]);

  const reshuffleTagline = useCallback(() => {
    setTagline(() => pickRandom(taglines));
  }, [taglines]);

  const taglineText = useMemo(() => tagline(data), [tagline, data]);

  const capture = useCallback(async () => {
    if (!posterRef.current) return null;
    return captureRef(posterRef, { format: 'png', quality: 1 });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('Permission denied'));
        return;
      }
      const uri = await capture();
      if (!uri) return;
      const fileUri = uri.startsWith('file://') ? uri : 'file://' + uri;
      await MediaLibrary.saveToLibraryAsync(fileUri);
      Alert.alert(t('Saved to Photos!'));
    } catch (e) {
      console.warn('[StatsPoster] save failed:', e);
      Alert.alert(t('Failed to save'));
    } finally {
      setSaving(false);
    }
  }, [capture, t]);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const uri = await capture();
      if (!uri) return;
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch {
      // user cancelled
    } finally {
      setSharing(false);
    }
  }, [capture]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={s.container}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={20} color={C.chromeTextSecondary} strokeWidth={2} />
          </TouchableOpacity>

          <View ref={posterRef} collapsable={false} style={s.poster}>
            {/* Identity */}
            <View style={s.identityRow}>
              {agentAvatarUri ? (
                <Image source={{ uri: agentAvatarUri }} style={[s.avatarImage, { borderColor: theme.accentMuted }]} />
              ) : (
                <View style={[s.emojiWrap, { backgroundColor: theme.accentSoft, borderColor: theme.accentMuted }]}>
                  <Text style={s.agentEmoji}>{getDisplayAgentEmoji(data.agentEmoji)}</Text>
                </View>
              )}
              <View>
                <Text style={s.agentName}>{data.agentName}</Text>
                <Text style={s.dateText}>{formatDate(locale)}</Text>
              </View>
            </View>

            {/* Hero cost */}
            <Text style={[s.heroCost, { color: theme.accent }]}>
              {formatCost(data.cost)}
            </Text>
            <Text style={s.heroLabel}>{t('spent today')}</Text>

            {/* Random tagline */}
            <Text style={s.tagline}>{taglineText}</Text>

            {/* 2x2 stats */}
            <View style={s.grid}>
              <View style={[s.gridCard, { backgroundColor: theme.accentSoft }]}>
                <Text style={s.gridValue}>{data.tokens ?? '—'}</Text>
                <Text style={s.gridLabel}>{t('TOKENS')}</Text>
              </View>
              <View style={[s.gridCard, { backgroundColor: theme.accentSoft }]}>
                <Text style={s.gridValue}>
                  {data.messages != null ? String(data.messages) : '\u2014'}
                </Text>
                <Text style={s.gridLabel}>{t('MESSAGES')}</Text>
              </View>
              <View style={[s.gridCard, { backgroundColor: theme.accentSoft }]}>
                <Text style={s.gridValue}>
                  {data.toolCalls != null ? String(data.toolCalls) : '\u2014'}
                </Text>
                <Text style={s.gridLabel}>{t('TOOL CALLS')}</Text>
              </View>
              <View style={[s.gridCard, { backgroundColor: theme.accentSoft }]}>
                <Text style={s.gridValue}>{data.lastHeartbeat ?? '\u2014'}</Text>
                <Text style={s.gridLabel}>{t('PULSE')}</Text>
              </View>
            </View>

            {/* Branding */}
            <Text style={s.branding}>{'\u{1F43E} OpenClaw \u{00D7} Clawket \u{1F43E}'}</Text>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <PosterThemePicker current={theme} onSelect={setTheme} />
            <TouchableOpacity style={s.actionBtnSmall} onPress={reshuffleTagline} activeOpacity={0.7}>
              <RefreshCw size={16} color={C.chromeText} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={handleSave} activeOpacity={0.7} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={C.chromeText} />
              ) : (
                <Download size={18} color={C.chromeText} strokeWidth={2} />
              )}
              <Text style={s.actionText}>{t('Save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: theme.accent }]} onPress={handleShare} activeOpacity={0.7} disabled={sharing}>
              {sharing ? (
                <ActivityIndicator size="small" color={C.chromeText} />
              ) : (
                <Share2 size={18} color={C.chromeText} strokeWidth={2} />
              )}
              <Text style={s.actionText}>{t('Share')}</Text>
            </TouchableOpacity>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---- Styles ----

const POSTER_WIDTH = 280;

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    width: POSTER_WIDTH + 40,
  },
  closeBtn: {
    position: 'absolute',
    top: -36,
    right: 0,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  poster: {
    width: POSTER_WIDTH,
    backgroundColor: C.bg,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentEmoji: { fontSize: 22 },
  agentName: {
    fontSize: 17,
    fontWeight: FontWeight.semibold,
    color: C.text,
  },
  dateText: {
    fontSize: 11,
    fontWeight: FontWeight.regular,
    color: C.textSecondary,
    marginTop: 1,
  },
  heroCost: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: FontWeight.medium,
    color: C.textSecondary,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 13,
    fontWeight: FontWeight.regular,
    color: C.textBody,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 20,
  },
  gridCard: {
    width: (POSTER_WIDTH - 48 - 8 - 3) / 2,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  gridValue: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
    color: C.text,
    marginBottom: 2,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    color: C.textSecondary,
    letterSpacing: 0.5,
  },
  branding: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
    color: C.textSecondary,
    letterSpacing: 0.3,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  actionBtnSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  actionText: {
    fontSize: 14,
    fontWeight: FontWeight.semibold,
    color: C.chromeText,
  },
});
