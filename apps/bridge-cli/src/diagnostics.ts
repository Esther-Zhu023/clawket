import { readFileSync } from 'node:fs';
import { Socket } from 'node:net';
import { homedir } from 'node:os';
import { getServicePaths, getServiceStatus, readPairingConfig } from '@clawket/bridge-core';
import {
  getOpenClawConfigDir,
  getOpenClawMediaDir,
  readOpenClawInfo,
  resolveGatewayUrl,
} from '@clawket/bridge-runtime';
import { parseLookbackToMs } from './log-parse.js';

export type CliDoctorReport = {
  paired: boolean;
  gatewayId: string | null;
  serverUrl: string | null;
  relayUrl: string | null;
  instanceId: string | null;
  serviceInstalled: boolean;
  serviceRunning: boolean;
  serviceMethod: string;
  servicePath: string;
  logPath: string;
  errorLogPath: string;
  openclawConfigDir: string;
  openclawMediaDir: string;
  openclawConfigFound: boolean;
  openclawAuthMode: 'token' | 'password' | null;
  openclawTokenFound: boolean;
  openclawPasswordFound: boolean;
  localGatewayUrl: string;
  localGatewayReachable: boolean;
};

export type PairPrerequisiteReport = Pick<
  CliDoctorReport,
  'openclawConfigFound'
  | 'openclawAuthMode'
  | 'openclawTokenFound'
  | 'openclawPasswordFound'
  | 'localGatewayUrl'
  | 'localGatewayReachable'
>;

export function readRecentCliLogs(input?: {
  lastMs?: number | null;
  lines?: number;
  includeErrorLog?: boolean;
}): string[] {
  const { logPath, errorLogPath } = getServicePaths();
  const lines = clampLines(input?.lines ?? 200);
  const lookbackMs = input?.lastMs ?? null;
  const cutoff = lookbackMs != null ? Date.now() - lookbackMs : null;
  const sources = [logPath];
  if (input?.includeErrorLog) {
    sources.push(errorLogPath);
  }

  const entries = sources.flatMap((path) => readLogFile(path));
  const filtered = cutoff == null
    ? entries
    : entries.filter((entry) => entry.ts != null && entry.ts >= cutoff);
  return filtered.slice(-lines).map((entry) => entry.raw);
}

export async function buildDoctorReport(): Promise<CliDoctorReport> {
  const config = readPairingConfig();
  const service = getServiceStatus();
  const openclaw = readOpenClawInfo();
  const localGatewayUrl = resolveGatewayUrl();
  const localGatewayReachable = await checkGatewayReachable(localGatewayUrl);

  return {
    paired: Boolean(config),
    gatewayId: config?.gatewayId ?? null,
    serverUrl: config?.serverUrl ?? null,
    relayUrl: config?.relayUrl ?? null,
    instanceId: config?.instanceId ?? null,
    serviceInstalled: service.installed,
    serviceRunning: service.running,
    serviceMethod: service.method,
    servicePath: service.servicePath,
    logPath: service.logPath,
    errorLogPath: service.errorLogPath,
    openclawConfigDir: getOpenClawConfigDir(),
    openclawMediaDir: getOpenClawMediaDir(),
    openclawConfigFound: openclaw.configFound,
    openclawAuthMode: openclaw.authMode,
    openclawTokenFound: Boolean(openclaw.token),
    openclawPasswordFound: Boolean(openclaw.password),
    localGatewayUrl,
    localGatewayReachable,
  };
}

export async function ensurePairPrerequisites(): Promise<CliDoctorReport> {
  const report = await buildDoctorReport();
  const failures = listPairPrerequisiteFailures(report);
  if (failures.length > 0) {
    throw new Error([
      'Cannot complete `clawket pair` because local OpenClaw prerequisites are not ready.',
      ...failures.map((item) => `- ${item}`),
      'Run `clawket doctor` for more details, or use `clawket pair --force` only if you intentionally want to bypass this safety check.',
    ].join('\n'));
  }
  return report;
}

export function listPairPrerequisiteFailures(report: PairPrerequisiteReport): string[] {
  const failures: string[] = [];
  if (!report.openclawConfigFound) {
    failures.push(`OpenClaw config was not found under ${formatOpenClawConfigLocations()}.`);
  }
  if (report.openclawTokenFound && report.openclawPasswordFound && report.openclawAuthMode == null) {
    failures.push('OpenClaw has both gateway token and password configured, but gateway.auth.mode is unset.');
  }
  if (!report.openclawTokenFound && !report.openclawPasswordFound) {
    failures.push('OpenClaw gateway auth is missing (token or password).');
  }
  if (report.openclawAuthMode === 'token' && !report.openclawTokenFound) {
    failures.push('OpenClaw gateway token is missing.');
  }
  if (report.openclawAuthMode === 'password' && !report.openclawPasswordFound) {
    failures.push('OpenClaw gateway password is missing.');
  }
  if (!report.localGatewayReachable) {
    failures.push(`Local OpenClaw Gateway is not reachable at ${report.localGatewayUrl}.`);
  }
  return failures;
}

function formatOpenClawConfigLocations(): string {
  const seen = new Set<string>();
  return [homedir(), '/root']
    .map((home) => `${home.trim()}/.openclaw`)
    .filter((path) => path !== '/.openclaw')
    .filter((path) => {
      if (seen.has(path)) return false;
      seen.add(path);
      return true;
    })
    .join(' or ');
}

type ParsedLogEntry = {
  ts: number | null;
  raw: string;
};

function readLogFile(path: string): ParsedLogEntry[] {
  try {
    const raw = readFileSync(path, 'utf8');
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => ({
        raw: line,
        ts: parseTimestamp(line),
      }));
  } catch {
    return [];
  }
}

function parseTimestamp(line: string): number | null {
  const matched = line.match(/^\[(\d{13})\]\s/);
  if (!matched) return null;
  const value = Number(matched[1]);
  return Number.isFinite(value) ? value : null;
}

function clampLines(value: number): number {
  if (!Number.isFinite(value)) return 200;
  return Math.max(1, Math.min(2_000, Math.floor(value)));
}

async function checkGatewayReachable(gatewayUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(gatewayUrl);
    const host = parsed.hostname || '127.0.0.1';
    const port = parsed.port ? Number(parsed.port) : (parsed.protocol === 'wss:' ? 443 : 80);
    await new Promise<void>((resolve, reject) => {
      const socket = new Socket();
      socket.setTimeout(900);
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('timeout', () => {
        socket.destroy();
        reject(new Error('timeout'));
      });
      socket.once('error', (error) => {
        socket.destroy();
        reject(error);
      });
      socket.connect(port, host);
    });
    return true;
  } catch {
    return false;
  }
}
