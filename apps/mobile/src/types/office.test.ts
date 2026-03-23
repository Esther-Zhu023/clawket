import {
  DEFAULT_OFFICE_CHANNEL_SLOT_CONFIG,
  normalizeOfficeChannelSlotConfig,
} from './office';

describe('normalizeOfficeChannelSlotConfig', () => {
  it('keeps valid channel slot assignments for channel1 to channel4', () => {
    expect(normalizeOfficeChannelSlotConfig({
      channel1: 'whatsapp',
      channel2: 'telegram',
      channel3: 'slack',
      channel4: 'signal',
    })).toEqual({
      channel1: 'whatsapp',
      channel2: 'telegram',
      channel3: 'slack',
      channel4: 'signal',
    });
  });

  it('falls back to default slot assignments for invalid input', () => {
    expect(normalizeOfficeChannelSlotConfig({
      channel1: 'not-a-channel',
      channel2: null,
    })).toEqual(DEFAULT_OFFICE_CHANNEL_SLOT_CONFIG);
  });

  it('deduplicates channel assignments while preserving uniqueness', () => {
    expect(normalizeOfficeChannelSlotConfig({
      channel1: 'telegram',
      channel2: 'telegram',
      channel3: 'telegram',
      channel4: 'telegram',
    })).toEqual({
      channel1: 'telegram',
      channel2: 'discord',
      channel3: 'slack',
      channel4: 'feishu',
    });
  });
});
