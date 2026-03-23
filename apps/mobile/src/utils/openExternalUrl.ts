import { Linking } from 'react-native';

export async function openExternalUrl(url: string, onError: () => void): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    onError();
  }
}
