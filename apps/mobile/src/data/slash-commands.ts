export type SlashCommand = {
  key: string;
  command: string;
  description: string;
  action: 'send' | 'fill' | 'custom';
};

export const SLASH_COMMANDS: SlashCommand[] = [
  { key: 'status', command: '/status', description: 'Show session status', action: 'send' },
  { key: 'models', command: '/models', description: 'Browse and switch models', action: 'custom' },
  { key: 'compact', command: '/compact', description: 'Compact session context', action: 'send' },
  { key: 'think', command: '/think', description: 'Set thinking level (off/low/medium/high)', action: 'fill' },
  { key: 'fast', command: '/fast', description: 'Toggle fast mode', action: 'fill' },
  { key: 'new', command: '/new', description: 'Start a new session', action: 'send' },
  { key: 'reset', command: '/reset', description: 'Reset current session', action: 'send' },
  { key: 'stop', command: '/stop', description: 'Stop current generation', action: 'send' },
  { key: 'reasoning', command: '/reasoning', description: 'Toggle reasoning mode', action: 'send' },
  { key: 'elevated', command: '/elevated', description: 'Toggle elevated permissions', action: 'send' },
  { key: 'usage', command: '/usage', description: 'Show token usage stats', action: 'send' },
  { key: 'context', command: '/context', description: 'Show context window usage', action: 'send' },
  { key: 'session', command: '/session', description: 'Show current session info', action: 'send' },
  { key: 'agents', command: '/agents', description: 'List available agents', action: 'send' },
  { key: 'commands', command: '/commands', description: 'List all commands', action: 'send' },
  { key: 'kill', command: '/kill', description: 'Kill running subagents', action: 'send' },
  { key: 'steer', command: '/steer', description: 'Send instruction to a subagent', action: 'fill' },
  { key: 'send', command: '/send', description: 'Send message to another session', action: 'fill' },
  { key: 'tts', command: '/tts', description: 'Text-to-speech', action: 'fill' },
  { key: 'queue', command: '/queue', description: 'Show or change queue mode', action: 'send' },
  { key: 'help', command: '/help', description: 'Show available commands', action: 'send' },
  { key: 'model', command: '/model', description: 'Switch to a specific model', action: 'fill' },
  { key: 'verbose', command: '/verbose', description: 'Toggle verbose mode', action: 'send' },
  { key: 'restart', command: '/restart', description: 'Restart the gateway', action: 'send' },
];
