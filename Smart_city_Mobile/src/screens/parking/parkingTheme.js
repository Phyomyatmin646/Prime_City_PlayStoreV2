export function getParkingTheme(appTheme) {
  if (appTheme?.mode === 'light') {
    return {
      ...appTheme,
      raised: appTheme.raised || appTheme.surface,
      iconSurface: appTheme.iconSurface || appTheme.primaryBg,
      goldBorder: appTheme.goldBorder || `${appTheme.primary}70`,
    };
  }

  return {
    ...appTheme,
    background: '#05080A',
    surface: '#080C0F',
    card: '#0E1316',
    raised: '#13181C',
    input: '#090E11',
    primary: '#F5AD27',
    primaryBg: '#2B1D06',
    primaryText: '#171006',
    text: '#F5F3EF',
    subtext: '#AAA39D',
    border: '#30363A',
    goldBorder: 'rgba(245, 173, 39, 0.58)',
    iconSurface: 'rgba(245, 173, 39, 0.09)',
    tabBar: '#080C0F',
    tabBarBorder: '#2A2E31',
    inactive: '#716D69',
    icon: '#DED9D2',
    shadow: '#000000',
    statusBar: 'light-content',
  };
}
