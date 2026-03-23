type UnknownRecord = Record<string, unknown>;

export type ExecSecurity = 'deny' | 'allowlist' | 'full';
export type ExecAsk = 'always' | 'on-miss' | 'off';

export type GatewayToolSettings = {
  webSearchEnabled: boolean;
  webFetchEnabled: boolean;
  execSecurity: ExecSecurity;
  execAsk: ExecAsk;
  mediaImageEnabled: boolean;
  mediaAudioEnabled: boolean;
  mediaVideoEnabled: boolean;
  linksEnabled: boolean;
};

const EXEC_SECURITY_VALUES: ExecSecurity[] = ['deny', 'allowlist', 'full'];
const EXEC_ASK_VALUES: ExecAsk[] = ['always', 'on-miss', 'off'];

export function parseGatewayToolSettings(config: Record<string, unknown> | null): GatewayToolSettings {
  const tools = readRecord(config?.tools);
  const web = readRecord(tools?.web);
  const webSearch = readRecord(web?.search);
  const webFetch = readRecord(web?.fetch);
  const exec = readRecord(tools?.exec);
  const media = readRecord(tools?.media);
  const mediaImage = readRecord(media?.image);
  const mediaAudio = readRecord(media?.audio);
  const mediaVideo = readRecord(media?.video);
  const links = readRecord(tools?.links);

  return {
    webSearchEnabled: readBoolean(webSearch?.enabled, true),
    webFetchEnabled: readBoolean(webFetch?.enabled, true),
    execSecurity: readEnum(exec?.security, EXEC_SECURITY_VALUES, 'deny'),
    execAsk: readEnum(exec?.ask, EXEC_ASK_VALUES, 'on-miss'),
    mediaImageEnabled: readBoolean(mediaImage?.enabled, true),
    mediaAudioEnabled: readBoolean(mediaAudio?.enabled, true),
    mediaVideoEnabled: readBoolean(mediaVideo?.enabled, true),
    linksEnabled: readBoolean(links?.enabled, true),
  };
}

export function buildGatewayToolPatch(input: GatewayToolSettings): Record<string, unknown> {
  return {
    tools: {
      web: {
        search: { enabled: input.webSearchEnabled },
        fetch: { enabled: input.webFetchEnabled },
      },
      exec: {
        security: input.execSecurity,
        ask: input.execAsk,
      },
      media: {
        image: { enabled: input.mediaImageEnabled },
        audio: { enabled: input.mediaAudioEnabled },
        video: { enabled: input.mediaVideoEnabled },
      },
      links: { enabled: input.linksEnabled },
    },
  };
}

/**
 * Returns the set of tool IDs that are globally disabled by gateway-level capability settings.
 */
export function getGatewayDisabledToolIds(settings: GatewayToolSettings): Set<string> {
  const ids: string[] = [];
  if (!settings.webSearchEnabled) ids.push('web_search');
  if (!settings.webFetchEnabled) ids.push('web_fetch');
  if (settings.execSecurity === 'deny') ids.push('exec', 'apply_patch');
  if (!settings.mediaImageEnabled) ids.push('image');
  if (!settings.mediaAudioEnabled) ids.push('audio');
  if (!settings.mediaVideoEnabled) ids.push('video');
  if (!settings.linksEnabled) ids.push('links');
  return new Set(ids);
}

function readRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function readBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return defaultValue;
}

function readEnum<T extends string>(value: unknown, allowed: T[], defaultValue: T): T {
  if (typeof value === 'string' && (allowed as string[]).includes(value)) return value as T;
  return defaultValue;
}
