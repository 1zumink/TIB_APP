import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, T } from './ui';
import { TibLogo } from './TibLogo';
import { useStore } from '../store/StoreContext';
import { colors, radius, space } from '../theme';

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useStore();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Supabase auth needs an email under the hood — we build a synthetic one from the login.
  const loginToEmail = (l: string) => `${l.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')}@tib.app`;
  const cleanLogin = login.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');

  const valid =
    cleanLogin.length >= 3 &&
    password.length >= 6 &&
    (mode === 'in' || name.trim().length > 0);

  const submit = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const email = loginToEmail(login);
      if (mode === 'in') {
        const res = await signIn?.(email, password);
        if (res?.error) setError(translate(res.error));
      } else {
        const res = await signUp?.(email, password, name.trim());
        if (res?.error) setError(translate(res.error));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: space.xl,
          justifyContent: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <TibLogo size={30} color="#fff" />
          </View>
        </View>
        <T variant="display" style={{ fontSize: 44 }}>
          TIB
        </T>
        <T variant="body" color={colors.textDim} style={{ marginTop: 4, marginBottom: space.xxl }}>
          {mode === 'in' ? 'С возвращением. Погнали продвигаться.' : 'Заводи аккаунт и подключайся к команде.'}
        </T>

        {/* tabs */}
        <View style={styles.tabs}>
          <Tab label="Вход" active={mode === 'in'} onPress={() => setMode('in')} />
          <Tab label="Регистрация" active={mode === 'up'} onPress={() => setMode('up')} />
        </View>

        {mode === 'up' ? (
          <Input label="Имя" value={name} onChangeText={setName} placeholder="Как тебя показывать" autoCapitalize="words" />
        ) : null}
        <Input
          label="Логин"
          value={login}
          onChangeText={setLogin}
          placeholder="например: ilya"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input
          label="Пароль"
          value={password}
          onChangeText={setPassword}
          placeholder="минимум 6 символов"
          secureTextEntry
          autoCapitalize="none"
        />

        {error ? (
          <View style={styles.error}>
            <T variant="small" color={colors.red} style={{ fontWeight: '700' }}>
              {error}
            </T>
          </View>
        ) : null}
        {info ? (
          <View style={styles.info}>
            <T variant="small" color={colors.text}>
              {info}
            </T>
          </View>
        ) : null}

        <Button
          title={loading ? '' : mode === 'in' ? 'Войти' : 'Создать аккаунт'}
          tone="red"
          disabled={!valid || loading}
          onPress={submit}
          style={{ marginTop: space.md }}
        />
        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: -44, marginBottom: 20 }} />
        ) : null}

        <Pressable onPress={() => setMode(mode === 'in' ? 'up' : 'in')} style={{ marginTop: space.xl, alignItems: 'center' }}>
          <T variant="small">
            {mode === 'in' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
            <T variant="small" color={colors.red} style={{ fontWeight: '800' }}>
              {mode === 'in' ? 'Регистрация' : 'Войти'}
            </T>
          </T>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active ? { backgroundColor: colors.white } : null]}>
      <T variant="body" color={active ? colors.black : colors.textDim} style={{ fontWeight: '800' }}>
        {label}
      </T>
    </Pressable>
  );
}

function Input({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <T variant="label" style={{ marginBottom: 8 }}>
        {label}
      </T>
      <TextInput
        {...props}
        placeholderTextColor={colors.textFaint}
        style={styles.input}
      />
    </View>
  );
}

function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Неверный логин или пароль';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Такой логин уже занят';
  if (m.includes('password should be')) return 'Пароль слишком короткий (минимум 6 символов)';
  if (m.includes('email not confirmed'))
    return 'Нужно выключить подтверждение email в настройках Supabase';
  if (m.includes('network') || m.includes('fetch')) return 'Нет связи с сервером';
  return msg;
}

const styles = StyleSheet.create({
  logoRow: { marginBottom: space.lg },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: space.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  error: {
    backgroundColor: colors.redSoft,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  info: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
});
