import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();

const files = [
  resolve(root, 'android/app/capacitor.build.gradle'),
  resolve(root, 'android/capacitor-cordova-android-plugins/build.gradle'),
  resolve(root, 'node_modules/@capacitor/android/capacitor/build.gradle'),
  resolve(root, 'node_modules/@capacitor/splash-screen/android/build.gradle'),
  resolve(root, 'node_modules/@capacitor/status-bar/android/build.gradle'),
];

for (const file of files) {
  const original = await readFile(file, 'utf8');
  const updated = original
    .replaceAll('JavaVersion.VERSION_21', 'JavaVersion.VERSION_17')
    .replaceAll('java-version: 21', 'java-version: 17');

  if (updated !== original) {
    await writeFile(file, updated, 'utf8');
    console.log(`patched ${file}`);
  }
}
