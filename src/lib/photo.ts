import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { supabase } from './supabase';

/** Where picked portraits are kept. */
const FOLDER = 'card-photos';

/**
 * Copy a picked image into the app's document folder.
 *
 * The picker hands back a URI in a cache or a provider location — the system
 * is free to clear the first and revoke access to the second, and either would
 * leave the card with a broken portrait some days later. If the copy fails for
 * any reason we still return the original URI: a photo that might expire beats
 * no photo at all.
 */
function persist(uri: string): string {
  try {
    const dir = new Directory(Paths.document, FOLDER);
    if (!dir.exists) dir.create({ intermediates: true });
    const source = new File(uri);
    const ext = (source.extension || '.jpg').replace('.', '');
    const dest = new File(dir, `portrait-${Date.now()}.${ext}`);
    source.copySync(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

/** Shared picker options: a square-ish crop at a size the card can use. */
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  // The portrait slot is 262 × 333 in the design — a 3:4 crop fills it exactly.
  aspect: [3, 4],
  quality: 0.85,
};

type PickResult = { uri: string } | { error: string } | null;

const first = (result: ImagePicker.ImagePickerResult): PickResult => {
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  return asset ? { uri: persist(asset.uri) } : null;
};

/** Photos already on the phone. */
export async function pickFromLibrary(): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { error: 'Нет доступа к галерее' };
  return first(await ImagePicker.launchImageLibraryAsync(OPTIONS));
}

/** A new photo, taken now. */
export async function pickFromCamera(): Promise<PickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { error: 'Нет доступа к камере' };
  return first(await ImagePicker.launchCameraAsync(OPTIONS));
}

/**
 * Any image file, through the system file browser — downloads, cloud storage,
 * anywhere the picker above cannot reach.
 */
export async function pickFromFiles(): Promise<PickResult> {
  try {
    const file = await File.pickFileAsync({ mimeTypes: ['image/*'] });
    const picked = Array.isArray(file) ? file[0] : file;
    return picked ? { uri: persist(picked.uri) } : null;
  } catch {
    return null; // the picker throws on cancel
  }
}


/** Bucket the portraits live in; created by supabase/migration-portraits-bucket.sql. */
export const PORTRAIT_BUCKET = 'portraits';

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
};

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

/** The picked image as raw bytes, whichever kind of URI the platform handed us. */
async function readImage(uri: string): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  if (Platform.OS === 'web') {
    // `blob:` and `data:` URIs both answer to fetch.
    const blob = await (await fetch(uri)).blob();
    return { bytes: await blob.arrayBuffer(), contentType: blob.type || 'image/jpeg' };
  }
  const file = new File(uri);
  const ext = (file.extension || '.jpg').replace('.', '').toLowerCase();
  const bytes = await file.bytes();
  return {
    bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    contentType: MIME_BY_EXT[ext] ?? 'image/jpeg',
  };
}

/**
 * Put the portrait in Supabase Storage and return the URL the card should print.
 *
 * What the picker returns only means something on the device that picked it: a
 * `file://` path on a phone, a `blob:` handle the browser drops on reload. Both
 * look fine until you refresh — which is exactly why the photo kept vanishing.
 * The bytes have to leave the device before the URL is worth storing.
 */
export async function uploadPortrait(uri: string, userId: string): Promise<string> {
  if (!supabase) return uri; // local demo mode — there is no server to upload to

  const { bytes, contentType } = await readImage(uri);
  const ext = EXT_BY_MIME[contentType] ?? 'jpg';
  // Owner's folder first: the storage policies key off it.
  const path = `${userId}/portrait-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(PORTRAIT_BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(error.message);

  return supabase.storage.from(PORTRAIT_BUCKET).getPublicUrl(path).data.publicUrl;
}
