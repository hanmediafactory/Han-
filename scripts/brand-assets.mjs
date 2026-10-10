import sharp from 'sharp';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const icon = readFileSync('public/logo.png');
for (const size of [192, 512]) {
  await sharp(icon).resize(size, size).png().toFile(`public/han-${size}.png`);
}
await sharp(icon).resize(1024, 1024).png().toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');

const res = 'android/app/src/main/res';
for (const [density, size] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
    await sharp(icon).resize(size, size).png().toFile(`${res}/mipmap-${density}/${name}`);
  }
  const logoResize = Math.round(size * 1.5);
  const foreground = await sharp(icon).resize(logoResize, logoResize).png().toBuffer();
  const canvasSize = Math.round(size * 2.25);
  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: foreground, gravity: 'center' }])
    .png()
    .toFile(`${res}/mipmap-${density}/ic_launcher_foreground.png`);
}

writeFileSync(`${res}/values/ic_launcher_background.xml`, '<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#000000</color></resources>');
writeFileSync(`${res}/drawable/ic_launcher_background.xml`, '<?xml version="1.0" encoding="utf-8"?><vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#000000" android:pathData="M0,0h108v108h-108z"/></vector>');

const splashPaths = [];
for (const entry of readdirSync(res, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name.startsWith('drawable')) {
    for (const name of readdirSync(join(res, entry.name))) {
      if (name === 'splash.png') splashPaths.push(join(res, entry.name, name));
    }
  }
}
for (const name of readdirSync('ios/App/App/Assets.xcassets/Splash.imageset')) {
  if (name.endsWith('.png')) splashPaths.push(join('ios/App/App/Assets.xcassets/Splash.imageset', name));
}

for (const path of splashPaths) {
  const { width, height } = await sharp(path).metadata();
  const logoSize = Math.round(Math.min(width, height) * 0.45);
  const resizedLogo = await sharp(icon).resize(logoSize, logoSize).png().toBuffer();
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toFile(path);
}

console.log('HAN monochrome launcher icons and splash screens generated from official logo.');

