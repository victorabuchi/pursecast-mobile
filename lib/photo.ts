import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_SIDE = 480;

// Picks a photo and shrinks it to a small JPEG data: URL, the same size the web
// app's photo field makes, so uploads are quick and the database stays light.
export async function pickPhoto(max = MAX_SIDE): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const asset = picked.canceled ? null : picked.assets[0];
  if (!asset) return null;
  const scale = Math.min(1, max / Math.max(asset.width, asset.height));
  const out = await ImageManipulator.manipulateAsync(asset.uri, scale < 1 ? [{ resize: asset.width >= asset.height ? { width: Math.round(asset.width * scale) } : { height: Math.round(asset.height * scale) } }] : [], { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  return out.base64 ? `data:image/jpeg;base64,${out.base64}` : null;
}
