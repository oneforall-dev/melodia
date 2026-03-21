import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { translations, detectLanguage, LanguageCode } from '../services/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: typeof translations['English'];
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: PropsWithChildren<{}>) => {
  const [language, setLanguage] = useState<LanguageCode>('English');

  useEffect(() => {
    setLanguage(detectLanguage());
  }, []);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};