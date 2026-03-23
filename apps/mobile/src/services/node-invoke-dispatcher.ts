import {
  HandlerResult,
  NodeInvokeHandler,
  handleDeviceInfo,
  handleDeviceStatus,
  handleSystemNotify,
  handleCameraCapture,
  handleCameraPick,
  handleLocationGet,
  handleClipboardRead,
  handleClipboardWrite,
  handleMediaSave,
} from './node-handlers';
import {
  DEFAULT_NODE_CAPABILITY_TOGGLES,
  NodeCapabilityToggles,
} from './node-capabilities';

const HANDLERS: Record<string, NodeInvokeHandler> = {
  'device.info': handleDeviceInfo,
  'device.status': handleDeviceStatus,
  'system.notify': handleSystemNotify,
  'camera.capture': handleCameraCapture,
  'camera.pick': handleCameraPick,
  'location.get': handleLocationGet,
  'clipboard.read': handleClipboardRead,
  'clipboard.write': handleClipboardWrite,
  'media.save': handleMediaSave,
};

/** All registered command names. Sent to gateway during connect handshake. */
export const NODE_COMMANDS: string[] = Object.keys(HANDLERS);

/** Capability namespaces derived from command prefixes. */
export const NODE_CAPS: string[] = [...new Set(NODE_COMMANDS.map((cmd) => cmd.split('.')[0]))];

function isCommandAllowedByToggles(command: string, toggles: NodeCapabilityToggles): boolean {
  if (command in toggles) {
    return toggles[command as keyof NodeCapabilityToggles];
  }
  return true;
}

export function getEnabledNodeCommands(toggles: NodeCapabilityToggles = DEFAULT_NODE_CAPABILITY_TOGGLES): string[] {
  return NODE_COMMANDS.filter((command) => isCommandAllowedByToggles(command, toggles));
}

export function getEnabledNodeCaps(toggles: NodeCapabilityToggles = DEFAULT_NODE_CAPABILITY_TOGGLES): string[] {
  const commands = getEnabledNodeCommands(toggles);
  return [...new Set(commands.map((cmd) => cmd.split('.')[0]))];
}

/** Dispatch an invoke request to the matching handler. */
export async function dispatchNodeInvoke(
  command: string,
  params: unknown,
  toggles: NodeCapabilityToggles = DEFAULT_NODE_CAPABILITY_TOGGLES,
): Promise<HandlerResult> {
  if (!isCommandAllowedByToggles(command, toggles)) {
    return {
      ok: false,
      error: {
        code: 'CAPABILITY_DISABLED',
        message: `Capability is disabled for command: ${command}`,
      },
    };
  }
  const handler = HANDLERS[command];
  if (!handler) {
    return {
      ok: false,
      error: { code: 'UNKNOWN_COMMAND', message: `Unknown command: ${command}` },
    };
  }
  try {
    return await handler(params);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: { code: 'HANDLER_ERROR', message },
    };
  }
}
