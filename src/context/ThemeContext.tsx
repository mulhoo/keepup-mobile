import React, {createContext, useContext, useState, useEffect} from 'react';
import {getStoredTheme, saveStoredTheme, DEFAULT_THEME, type StoredTheme} from '../services/preferences';
import type {ThemeColors} from '../services/themes';

interface ThemeContextValue {
  theme: StoredTheme;
  colors: ThemeColors;
  setTheme: (theme: StoredTheme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  colors: DEFAULT_THEME.colors,
  setTheme: async () => {},
});

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [theme, setThemeState] = useState<StoredTheme>(DEFAULT_THEME);

  useEffect(() => {
    getStoredTheme().then(setThemeState);
  }, []);

  async function setTheme(newTheme: StoredTheme) {
    setThemeState(newTheme);
    await saveStoredTheme(newTheme);
  }

  return (
    <ThemeContext.Provider value={{theme, colors: theme.colors, setTheme}}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
