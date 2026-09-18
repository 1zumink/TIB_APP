import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirm. React Native's Alert doesn't reliably show on web,
 * so there we fall back to window.confirm. onConfirm runs only if the user agrees.
 */
export function confirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'Удалить'
) {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(text)) onConfirm();
    return;
  }
  Alert.alert(title, message || undefined, [
    { text: 'Отмена', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
