import React, { createContext, useContext, useState } from 'react';
import { primeDarkTheme, primeLightTheme } from '../theme/primeTheme';

export const darkTheme = primeDarkTheme;

export const lightTheme = primeLightTheme;

export const ThemeContext = createContext({
  theme: darkTheme,
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(darkTheme);
  const toggleTheme = () =>
    setTheme(t => (t.mode === 'dark' ? lightTheme : darkTheme));
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
