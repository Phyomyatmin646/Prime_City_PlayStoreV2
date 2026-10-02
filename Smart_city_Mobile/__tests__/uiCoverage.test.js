import fs from 'node:fs';
import path from 'node:path';

const SOURCE_ROOT = path.resolve(__dirname, '../src');

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const itemPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(itemPath);
    return /\.(js|jsx|ts|tsx)$/.test(entry.name) ? [itemPath] : [];
  });
}

describe('system UI coverage guardrails', () => {
  const files = sourceFiles(SOURCE_ROOT);

  it('routes every application-owned alert through the Prime alert service', () => {
    const nativeAlertFiles = files.filter(file =>
      fs.readFileSync(file, 'utf8').includes('Alert.alert('),
    );
    expect(nativeAlertFiles).toEqual([]);
  });

  it('uses the Myanmar-aware text primitives for visible app text', () => {
    const uncovered = files.filter(file => {
      if (file.endsWith('AppText.jsx')) return false;
      const source = fs.readFileSync(file, 'utf8');
      const rendersText = /<Text(?:Input)?(?:\s|>)/.test(source);
      return rendersText && !source.includes('AppText');
    });

    expect(uncovered).toEqual([]);
  });

  it('ships every Walone variant in the iOS resource configuration', () => {
    const infoPlist = fs.readFileSync(
      path.resolve(__dirname, '../ios/SmartCityMobile/Info.plist'),
      'utf8',
    );
    const project = fs.readFileSync(
      path.resolve(
        __dirname,
        '../ios/SmartCityMobile.xcodeproj/project.pbxproj',
      ),
      'utf8',
    );

    for (const filename of [
      'Z06-Walone Regular.ttf',
      'Z06-Walone Bold.ttf',
      'Z06-Walone Thin.ttf',
    ]) {
      expect(infoPlist).toContain(filename);
      expect(project).toContain(`${filename} in Resources`);
    }
  });
});
