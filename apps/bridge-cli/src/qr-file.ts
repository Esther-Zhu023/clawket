import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import QRCode from 'qrcode';
import type { PairingInfo } from '@clawket/bridge-core';
import { getOpenClawMediaDir } from '@clawket/bridge-runtime';

const DEFAULT_QR_DIR = getOpenClawMediaDir();

export async function writePairingQrPng(
  paired: PairingInfo,
  outputPath?: string | null,
): Promise<string> {
  const targetPath = resolveQrOutputPath(paired.config.gatewayId, outputPath);
  return writeQrPng(paired.qrPayload, targetPath);
}

export async function writeRawQrPng(
  payload: string,
  fileStem: string,
  outputPath?: string | null,
): Promise<string> {
  const targetPath = resolveQrOutputPath(fileStem, outputPath);
  return writeQrPng(payload, targetPath);
}

async function writeQrPng(payload: string, targetPath: string): Promise<string> {
  mkdirSync(dirname(targetPath), { recursive: true });
  const dataUrl = await QRCode.toDataURL(payload, {
    type: 'image/png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 720,
  });
  const encoded = dataUrl.replace(/^data:image\/png;base64,/, '');
  writeFileSync(targetPath, Buffer.from(encoded, 'base64'));
  return targetPath;
}

export function resolveQrOutputPath(fileStem: string, outputPath?: string | null): string {
  const trimmed = outputPath?.trim();
  if (trimmed) {
    return isAbsolute(trimmed) ? trimmed : resolve(trimmed);
  }
  return join(DEFAULT_QR_DIR, `${fileStem}.png`);
}
