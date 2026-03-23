import type { UiMessage } from '../types/chat';

export type MessageFavoriteIdentity = {
  gatewayConfigId: string;
  agentId: string;
  sessionKey: string;
  message: Pick<
    UiMessage,
    | 'id'
    | 'role'
    | 'text'
    | 'timestampMs'
    | 'modelLabel'
    | 'toolName'
    | 'toolSummary'
    | 'toolStatus'
  >;
};

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function buildFavoriteMessageKey({
  gatewayConfigId,
  agentId,
  sessionKey,
  message,
}: MessageFavoriteIdentity): string {
  const fingerprint = [
    message.id,
    message.role,
    String(message.timestampMs ?? 0),
    message.modelLabel ?? '',
    message.toolName ?? '',
    message.toolSummary ?? '',
    message.toolStatus ?? '',
    hashString(message.text ?? ''),
  ].join('::');

  return `favorite:${gatewayConfigId}::${agentId}::${sessionKey}::${fingerprint}`;
}
