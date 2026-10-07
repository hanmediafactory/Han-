import sharp from 'sharp';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const icon=readFileSync('public/han-icon.svg');
for(const size of [192,512])await sharp(icon).resize(size,size).png().toFile(`public/han-${size}.png`);
await sharp(icon).resize(1024,1024).png().toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
const res='android/app/src/main/res';
for(const [density,size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]){
 for(const name of ['ic_launcher.png','ic_launcher_round.png'])await sharp(icon).resize(size,size).png().toFile(`${res}/mipmap-${density}/${name}`);
 const foreground=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><text x="54" y="60" text-anchor="middle" font-family="Georgia,serif" font-size="23" fill="#fff">HAN</text></svg>');
 await sharp(foreground).resize(Math.round(size*2.25),Math.round(size*2.25)).png().toFile(`${res}/mipmap-${density}/ic_launcher_foreground.png`);
}
writeFileSync(`${res}/values/ic_launcher_background.xml`,'<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#000000</color></resources>');
writeFileSync(`${res}/drawable/ic_launcher_background.xml`,'<?xml version="1.0" encoding="utf-8"?><vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#000000" android:pathData="M0,0h108v108h-108z"/></vector>');
const splashPaths=[];
for(const entry of readdirSync(res,{withFileTypes:true}))if(entry.isDirectory()&&entry.name.startsWith('drawable'))for(const name of readdirSync(join(res,entry.name)))if(name==='splash.png')splashPaths.push(join(res,entry.name,name));
for(const name of readdirSync('ios/App/App/Assets.xcassets/Splash.imageset'))if(name.endsWith('.png'))splashPaths.push(join('ios/App/App/Assets.xcassets/Splash.imageset',name));
for(const path of splashPaths){const {width,height}=await sharp(path).metadata();const fontSize=Math.round(Math.min(width,height)*.16);const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#000"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Georgia,serif" font-size="${fontSize}" fill="#fff">HAN</text></svg>`);const png=await sharp(svg).png().toBuffer();writeFileSync(path,png);}
console.log('HAN monochrome launcher icons and splash screens generated.');
