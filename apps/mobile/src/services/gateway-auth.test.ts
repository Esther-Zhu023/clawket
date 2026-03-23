import nacl from 'tweetnacl';
import { sha256 } from 'js-sha256';
import { ensureIdentity } from './gateway-auth';
import { StorageService } from './storage';

jest.mock('./storage', () => ({
  StorageService: {
    getIdentity: jest.fn(() => Promise.resolve(null)),
    setIdentity: jest.fn(() => Promise.resolve()),
    clearIdentity: jest.fn(() => Promise.resolve()),
  },
}));

describe('ensureIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reuses a stored identity only when public key, secret key, and device id agree', async () => {
    const keyPair = nacl.sign.keyPair();
    const publicKeyHex = Buffer.from(keyPair.publicKey).toString('hex');
    const secretKeyHex = Buffer.from(keyPair.secretKey).toString('hex');
    const identity = {
      deviceId: sha256(keyPair.publicKey),
      publicKeyHex,
      secretKeyHex,
      createdAt: new Date().toISOString(),
    };
    (StorageService.getIdentity as jest.Mock).mockResolvedValue(identity);

    await expect(ensureIdentity()).resolves.toEqual(identity);
    expect(StorageService.clearIdentity).not.toHaveBeenCalled();
    expect(StorageService.setIdentity).not.toHaveBeenCalled();
  });

  it('regenerates a corrupted stored identity instead of reusing it', async () => {
    const keyPair = nacl.sign.keyPair();
    const corrupted = {
      deviceId: 'a'.repeat(64),
      publicKeyHex: Buffer.from(keyPair.publicKey).toString('hex'),
      secretKeyHex: 'ff'.repeat(64),
      createdAt: new Date().toISOString(),
    };
    (StorageService.getIdentity as jest.Mock).mockResolvedValue(corrupted);

    const next = await ensureIdentity();
    expect(next).not.toEqual(corrupted);
    expect(StorageService.clearIdentity).toHaveBeenCalled();
    expect(StorageService.setIdentity).toHaveBeenCalled();
  });
});
