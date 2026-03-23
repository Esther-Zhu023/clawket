import {
  DEFAULT_NODE_CAPABILITY_TOGGLES,
  normalizeNodeCapabilityToggles,
} from './node-capabilities';

describe('normalizeNodeCapabilityToggles', () => {
  it('returns defaults for non-object values', () => {
    expect(normalizeNodeCapabilityToggles(null)).toEqual(DEFAULT_NODE_CAPABILITY_TOGGLES);
  });

  it('preserves command-level toggles', () => {
    expect(normalizeNodeCapabilityToggles({
      'device.info': false,
      'device.status': true,
      'system.notify': false,
      'camera.capture': false,
      'camera.pick': true,
      'location.get': true,
      'clipboard.read': false,
      'clipboard.write': true,
      'media.save': false,
    })).toEqual({
      'device.info': false,
      'device.status': true,
      'system.notify': false,
      'camera.capture': false,
      'camera.pick': true,
      'location.get': true,
      'clipboard.read': false,
      'clipboard.write': true,
      'media.save': false,
    });
  });

  it('migrates legacy family toggles to command-level toggles', () => {
    expect(normalizeNodeCapabilityToggles({
      notification: false,
      camera: false,
      location: true,
      clipboard: false,
      media: true,
    })).toEqual({
      'device.info': true,
      'device.status': true,
      'system.notify': false,
      'camera.capture': false,
      'camera.pick': false,
      'location.get': true,
      'clipboard.read': false,
      'clipboard.write': false,
      'media.save': true,
    });
  });
});
