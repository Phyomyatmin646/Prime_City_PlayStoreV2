const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules/react-native-vector-icons/Fonts/Ionicons.ttf');
const androidTarget = path.join(root, 'android/app/src/main/assets/fonts/Ionicons.ttf');
const androidGradle = path.join(root, 'android/app/build.gradle');

if (
  fs.existsSync(androidGradle) &&
  fs.readFileSync(androidGradle, 'utf8').includes('react-native-vector-icons/fonts.gradle')
) {
  if (fs.existsSync(androidTarget)) {
    fs.unlinkSync(androidTarget);
  }

  console.log('[link-icon-fonts] Android Gradle copies Ionicons.ttf, skipping manual asset copy.');
  process.exit(0);
}

if (!fs.existsSync(src)) {
  console.warn('[link-icon-fonts] Ionicons.ttf not found, skipping.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(androidTarget), { recursive: true });
fs.copyFileSync(src, androidTarget);
console.log(`[link-icon-fonts] Copied Ionicons.ttf -> ${path.relative(root, androidTarget)}`);
