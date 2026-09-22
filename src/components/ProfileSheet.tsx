import React, { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from './Sheet';
import { ChipSelect, Field } from './form';
import { MotionPressable as Pressable, haptics } from './motion';
import { Button, T } from './ui';
import { SIGNATURE_KEYS, SIGNATURE_LABELS, SignatureKey } from './cardArt';
import { pickFromCamera, pickFromFiles, pickFromLibrary, uploadPortrait } from '../lib/photo';
import { nextPhoneValue } from '../lib/phone';
import { colors, radius, space } from '../theme';
import { Member, ProfilePatch } from '../types';

const PORTRAIT = require('../../assets/card/portrait.jpg');

const SIGNATURE_OPTIONS = SIGNATURE_KEYS.map((k) => SIGNATURE_LABELS[k]);
const keyForLabel = (label: string): SignatureKey =>
  SIGNATURE_KEYS.find((k) => SIGNATURE_LABELS[k] === label) ?? 'ilya';

/**
 * Everything printed on the TIB_ID, editable.
 *
 * Grouped by which face of the card the field lands on, so it is obvious what
 * a change will do — the card is the preview, this is just the form behind it.
 */
export function ProfileSheet({
  visible,
  member,
  onClose,
  onSave,
}: {
  visible: boolean;
  member: Member;
  onClose: () => void;
  onSave: (patch: ProfilePatch) => void;
}) {
  const [firstName, setFirstName] = useState(member.firstName);
  const [lastName, setLastName] = useState(member.lastName);
  const [role, setRole] = useState(member.role);
  const [roleSecondary, setRoleSecondary] = useState(member.roleSecondary);
  const [code, setCode] = useState(member.code);
  const [phone, setPhone] = useState(member.phone);
  const [website, setWebsite] = useState(member.website);
  const [handle, setHandle] = useState(member.handle);
  const [photoUrl, setPhotoUrl] = useState(member.photoUrl ?? '');
  const [signature, setSignature] = useState<SignatureKey>(member.signature ?? 'ilya');
  const [picking, setPicking] = useState(false);

  const runPicker = async (pick: () => Promise<{ uri: string } | { error: string } | null>) => {
    if (picking) return;
    setPicking(true);
    try {
      const result = await pick();
      if (!result) return; // cancelled
      if ('error' in result) {
        Alert.alert('Не получилось', result.error);
        return;
      }
      // Upload before showing it: the preview then proves the photo is on the
      // server, not just in this session's memory.
      setPhotoUrl(await uploadPortrait(result.uri, member.id));
      haptics.success();
    } catch (e: any) {
      Alert.alert('Не получилось', String(e?.message ?? e));
    } finally {
      setPicking(false);
    }
  };

  const submit = () =>
    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role.trim(),
      roleSecondary: roleSecondary.trim(),
      code: code.trim(),
      phone: phone.trim(),
      website: website.trim(),
      handle: handle.trim(),
      photoUrl: photoUrl.trim() || undefined,
      signature,
    });

  return (
    <Sheet visible={visible} onClose={onClose} title="Карточка">
      <T variant="label" style={{ marginBottom: space.md }}>
        Фото
      </T>
      <View style={styles.photoRow}>
        <Image source={photoUrl ? { uri: photoUrl } : PORTRAIT} style={styles.preview} />
        <View style={styles.photoActions}>
          <PhotoButton icon="images-outline" label="Галерея" onPress={() => runPicker(pickFromLibrary)} />
          <PhotoButton icon="camera-outline" label="Камера" onPress={() => runPicker(pickFromCamera)} />
          <PhotoButton icon="folder-outline" label="Файл" onPress={() => runPicker(pickFromFiles)} />
          {photoUrl ? (
            <PhotoButton icon="close" label="Убрать" onPress={() => setPhotoUrl('')} />
          ) : null}
        </View>
      </View>

      {/* Three marks came from the design; the card prints whichever is picked. */}
      <ChipSelect
        label="Подпись"
        options={SIGNATURE_OPTIONS}
        value={SIGNATURE_LABELS[signature]}
        onChange={(label) => setSignature(keyForLabel(label))}
      />

      <T variant="label" style={{ marginTop: space.sm, marginBottom: space.md }}>
        Лицевая сторона
      </T>
      <Field label="Имя" value={firstName} onChangeText={setFirstName} placeholder="Илья" />
      <Field label="Фамилия" value={lastName} onChangeText={setLastName} placeholder="Ланг" />
      {/* Two lines, because the card prints two — not one string that wraps. */}
      <Field label="Должность" value={role} onChangeText={setRole} placeholder="Art-Director" />
      <Field
        label="Должность, вторая строка"
        value={roleSecondary}
        onChangeText={setRoleSecondary}
        placeholder="Product Designer"
      />
      <Field
        label="Номер карточки"
        value={code}
        onChangeText={setCode}
        placeholder="148867694252"
        keyboardType="number-pad"
      />
      <Field
        label="Телефон"
        value={phone}
        // Brackets and dashes appear as you type; you only enter digits.
        onChangeText={(next) => setPhone(nextPhoneValue(phone, next))}
        placeholder="+7 (916) 611-47-35"
        keyboardType="phone-pad"
      />

      <T variant="label" style={{ marginTop: space.sm, marginBottom: space.md }}>
        Оборот
      </T>
      <Field
        label="Личный сайт"
        value={website}
        onChangeText={setWebsite}
        placeholder="iloveilyalang.com"
        autoCapitalize="none"
      />
      <Field
        label="Тег"
        value={handle}
        onChangeText={setHandle}
        placeholder="@kkklounada"
        autoCapitalize="none"
      />

      <View style={{ marginTop: space.sm }}>
        <Button title="Сохранить" tone="red" loading={picking} onPress={submit} />
      </View>
    </Sheet>
  );
}

function PhotoButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.photoButton} haptic="tap" onPress={onPress}>
      <Ionicons name={icon} size={16} color={colors.text} />
      <T variant="small" color={colors.text} style={{ fontWeight: '700', marginLeft: 6 }}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', gap: space.md, marginBottom: space.lg },
  preview: {
    width: 84,
    height: 107, // the card's 262 × 333 slot, same proportion
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  photoActions: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignContent: 'flex-start' },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHi,
  },
});
