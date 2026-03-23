import {
  dispatchNodeInvoke,
  getEnabledNodeCaps,
  getEnabledNodeCommands,
  NODE_COMMANDS,
  NODE_CAPS,
} from './node-invoke-dispatcher';

describe('NODE_COMMANDS', () => {
  it('contains all expected commands', () => {
    const expected = [
      'device.info',
      'device.status',
      'system.notify',
      'camera.capture',
      'camera.pick',
      'location.get',
      'clipboard.read',
      'clipboard.write',
      'media.save',
    ];
    for (const cmd of expected) {
      expect(NODE_COMMANDS).toContain(cmd);
    }
    expect(NODE_COMMANDS).toHaveLength(expected.length);
  });
});

describe('NODE_CAPS', () => {
  it('contains unique capability namespaces', () => {
    expect(NODE_CAPS).toContain('device');
    expect(NODE_CAPS).toContain('system');
    expect(NODE_CAPS).toContain('camera');
    expect(NODE_CAPS).toContain('location');
    expect(NODE_CAPS).toContain('clipboard');
    expect(NODE_CAPS).toContain('media');
    // No duplicates
    expect(new Set(NODE_CAPS).size).toBe(NODE_CAPS.length);
  });
});

describe('dispatchNodeInvoke', () => {
  it('routes device.info to handler', async () => {
    const result = await dispatchNodeInvoke('device.info', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      const payload = result.payload as Record<string, unknown>;
      expect(payload.platform).toBeDefined();
    }
  });

  it('routes device.status to handler', async () => {
    const result = await dispatchNodeInvoke('device.status', {});
    expect(result.ok).toBe(true);
  });

  it('routes system.notify to handler', async () => {
    const result = await dispatchNodeInvoke('system.notify', { title: 'Test' });
    expect(result.ok).toBe(true);
  });

  it('routes camera.capture to handler', async () => {
    const result = await dispatchNodeInvoke('camera.capture', {});
    expect(result.ok).toBe(true);
  });

  it('routes clipboard.read to handler', async () => {
    const result = await dispatchNodeInvoke('clipboard.read', {});
    expect(result.ok).toBe(true);
  });

  it('routes location.get to handler', async () => {
    const result = await dispatchNodeInvoke('location.get', {});
    expect(result.ok).toBe(true);
  });

  it('routes media.save to handler', async () => {
    const result = await dispatchNodeInvoke('media.save', { base64: 'test' });
    expect(result.ok).toBe(true);
  });

  it('returns UNKNOWN_COMMAND for unregistered commands', async () => {
    const result = await dispatchNodeInvoke('foo.bar', {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNKNOWN_COMMAND');
      expect(result.error.message).toContain('foo.bar');
    }
  });

  it('returns CAPABILITY_DISABLED when capability toggle is off', async () => {
    const result = await dispatchNodeInvoke('camera.capture', {}, {
      'device.info': true,
      'device.status': true,
      'system.notify': true,
      'camera.capture': false,
      'camera.pick': true,
      'location.get': true,
      'clipboard.read': true,
      'clipboard.write': true,
      'media.save': true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CAPABILITY_DISABLED');
  });
});

describe('capability filtering', () => {
  it('filters commands by toggles', () => {
    const commands = getEnabledNodeCommands({
      'device.info': true,
      'device.status': true,
      'system.notify': true,
      'camera.capture': false,
      'camera.pick': true,
      'location.get': true,
      'clipboard.read': true,
      'clipboard.write': true,
      'media.save': false,
    });
    expect(commands).not.toContain('camera.capture');
    expect(commands).toContain('camera.pick');
    expect(commands).not.toContain('media.save');
    expect(commands).toContain('location.get');
    expect(commands).toContain('device.info');
  });

  it('filters caps by toggles', () => {
    const caps = getEnabledNodeCaps({
      'device.info': true,
      'device.status': true,
      'system.notify': true,
      'camera.capture': false,
      'camera.pick': false,
      'location.get': false,
      'clipboard.read': true,
      'clipboard.write': true,
      'media.save': true,
    });
    expect(caps).not.toContain('camera');
    expect(caps).not.toContain('location');
    expect(caps).toContain('clipboard');
    expect(caps).toContain('media');
    expect(caps).toContain('device');
  });

  it('filters notification command independently from system namespace', () => {
    const commands = getEnabledNodeCommands({
      'device.info': true,
      'device.status': true,
      'system.notify': false,
      'camera.capture': true,
      'camera.pick': true,
      'location.get': true,
      'clipboard.read': true,
      'clipboard.write': true,
      'media.save': true,
    });
    expect(commands).not.toContain('system.notify');
  });
});
