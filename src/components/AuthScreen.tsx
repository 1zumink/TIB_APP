import {
  AnimatedSegment,
  MotionPressable as Pressable,
  MotionView,
  Shake,
  duration,
  fadeIn,
  fadeOut,
  haptics,
  timing,
} from './motion';
import React, { useEffect, useState } from 'react';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {
  KeyboardAvoidingView,
  Platform,
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

  // Failing a login is rare and worth being expressive about: the message
  // shakes once and the phone taps back, so it registers before you re-read it.
  useEffect(() => {
    if (error) haptics.error();
  }, [error]);

  // Supabase auth needs an email under the hood — we build a synthetic one from the login.
  const loginToEmail = (l: string) => `${l.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')}@tib.app`;
  const cleanLogin = login.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');

  const valid =
    cleanLogin.length >= 3 &&
    password.length >= 6 &&
    (mode === 'in' || name.trim().length > 0);

  const submit = async () => {
    if (!valid || loading) return;
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
    } catch (error) {
      setError(translate(error instanceof Error ? error.message : 'Не удалось выполнить вход. Попробуйте ещё раз.'));
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
        <Animated.View key={mode} entering={fadeIn}>
          <T variant="body" color={colors.textDim} style={{ marginTop: 4, marginBottom: space.xxl }}>
            {mode === 'in' ? 'С возвращением. Погнали продвигаться.' : 'Заводи аккаунт и подключайся к команде.'}
          </T>
        </Animated.View>

        {/* tabs */}
        <View style={styles.tabs}>
          <Tab label="Вход" active={mode === 'in'} onPress={() => setMode('in')} />
          <Tab label="Регистрация" active={mode === 'up'} onPress={() => setMode('up')} />
        </View>

        {mode === 'up' ? (
          <Animated.View entering={fadeIn} exiting={fadeOut}>
            <Input label="Имя" value={name} onChangeText={setName} placeholder="Как тебя показывать" autoCapitalize="words" />
          </Animated.View>
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
          <Shake trigger={error}>
            <MotionView style={styles.error}>
              <T variant="small" color={colors.red} style={{ fontWeight: '700' }}>
                {error}
              </T>
            </MotionView>
          </Shake>
        ) : null}
        {info ? (
          <View style={styles.info}>
            <T variant="small" color={colors.text}>
              {info}
            </T>
          </View>
        ) : null}

        {/* The button owns its own busy state — label and spinner swap in
            place, so the layout never jumps mid-submit. */}
        <Button
          title={mode === 'in' ? 'Войти' : 'Создать аккаунт'}
          tone="red"
          loading={loading}
          disabled={!valid}
          onPress={submit}
          style={{ marginTop: space.md }}
        />

        <Pressable
          onPress={() => setMode(mode === 'in' ? 'up' : 'in')}
          haptic="select"
          scaleTo={0.97}
          style={{ marginTop: space.xl, alignItems: 'center' }}
        >
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
    <AnimatedSegment
      label={label}
      active={active}
      onPress={onPress}
      activeBg={colors.white}
      inactiveBg="transparent"
      activeFg={colors.black}
      inactiveFg={colors.textDim}
      textStyle={{ fontSize: 15, fontWeight: '800' }}
      style={styles.tab}
    />
  );
}

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

/** Same focus treatment as the in-app fields, so the app never changes its mind. */
function Input({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  const focus = useSharedValue(0);
  const border = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.stroke, colors.red]),
    backgroundColor: interpolateColor(focus.value, [0, 1], [colors.surface, colors.bgElevated]),
  }));
  return (
    <View style={{ marginBottom: space.lg }}>
      <T variant="label" style={{ marginBottom: 8 }}>
        {label}
      </T>
      <AnimatedInput
        {...props}
        placeholderTextColor={colors.textFaint}
        onFocus={(e) => {
          focus.value = timing(1, duration.chip);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          focus.value = timing(0, duration.chip);
          props.onBlur?.(e);
        }}
        style={[styles.input, border]}
      />
    </View>
  );
}

function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('timed out') || m.includes('timeout'))
    return 'Сервер не ответил вовремя. Проверьте интернет или смените сеть и попробуйте ещё раз.';
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
