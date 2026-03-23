import React from 'react';
import { ApprovalCard } from '../../../components/chat/ApprovalCard';
import { ToolCard } from '../../../components/chat/ToolCard';
import { MessageBubble, MessageSelectionFrames } from '../../../components/MessageBubble';
import { UiMessage } from '../../../types/chat';

type Options = {
  forceSelected?: boolean;
  overlayMode?: boolean;
};

type Params = {
  agentDisplayName: string | null;
  chatFontSize: number;
  effectiveAvatarUri?: string;
  item: UiMessage;
  isFavorited: boolean;
  onAvatarPress: () => void;
  onImagePreview: (uris: string[], index: number) => void;
  onResolveApproval: (id: string, decision: 'allow-once' | 'allow-always' | 'deny') => void;
  onSelectMessage: (messageId: string, frames: MessageSelectionFrames) => void;
  onToggleSelection: (messageId: string) => void;
  options?: Options;
  selectedMessageId: string | null;
  showAgentAvatar: boolean;
  showModelUsage: boolean;
};

export function renderChatMessageBubble({
  agentDisplayName,
  chatFontSize,
  effectiveAvatarUri,
  item,
  isFavorited,
  onAvatarPress,
  onImagePreview,
  onResolveApproval,
  onSelectMessage,
  onToggleSelection,
  options,
  selectedMessageId,
  showAgentAvatar,
  showModelUsage,
}: Params): React.ReactElement {
  const reserveAvatarSlot = showAgentAvatar;

  if (item.approval) {
    return (
      <ApprovalCard
        approvalId={item.approval.id}
        command={item.approval.command}
        cwd={item.approval.cwd}
        host={item.approval.host}
        expiresAtMs={item.approval.expiresAtMs}
        status={item.approval.status}
        onResolve={onResolveApproval}
        reserveAvatarSlot={reserveAvatarSlot}
      />
    );
  }

  if (item.role === 'tool') {
    return (
      <ToolCard
        name={item.toolName ?? 'tool'}
        status={item.toolStatus ?? 'success'}
        summary={item.toolSummary ?? item.toolName ?? 'tool'}
        args={item.toolArgs}
        detail={item.toolDetail}
        durationMs={item.toolDurationMs}
        startedAtMs={item.toolStartedAt}
        finishedAtMs={item.toolFinishedAt}
        usage={item.usage}
        reserveAvatarSlot={reserveAvatarSlot}
      />
    );
  }

  return (
    <MessageBubble
      messageId={item.id}
      role={item.role}
      text={item.text}
      timestampMs={item.timestampMs}
      streaming={item.streaming}
      imageUris={item.imageUris}
      imageMetas={item.imageMetas}
      onImagePress={options?.overlayMode ? undefined : onImagePreview}
      avatarUri={item.role === 'assistant' && reserveAvatarSlot ? effectiveAvatarUri : undefined}
      onAvatarPress={item.role === 'assistant' ? onAvatarPress : undefined}
      displayName={item.role === 'assistant' ? (agentDisplayName ?? undefined) : undefined}
      isFavorited={item.role === 'assistant' && isFavorited}
      modelLabel={item.role === 'assistant' ? item.modelLabel : undefined}
      usage={item.role === 'assistant' ? item.usage : undefined}
      showModelUsage={showModelUsage}
      isSelected={options?.forceSelected ?? selectedMessageId === item.id}
      showSelectionHighlight={false}
      hideWhenSelected={!options?.overlayMode}
      onToggleSelection={options?.overlayMode ? undefined : onToggleSelection}
      onSelectMessage={options?.overlayMode ? undefined : onSelectMessage}
      overlayMode={options?.overlayMode}
      reserveAvatarSlot={item.role === 'assistant' ? reserveAvatarSlot : true}
      chatFontSize={chatFontSize}
    />
  );
}
