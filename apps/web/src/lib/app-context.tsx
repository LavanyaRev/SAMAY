'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TRANSLATIONS, type Locale, type TranslationDictionary } from './i18n/translations';
import { DEMO_ROLE_ACCOUNTS } from './mock-data';

export type StatutoryRole =
  | 'INSTITUTION'
  | 'REGIONAL_OFFICER'
  | 'BUREAU_OFFICER'
  | 'COMMITTEE_MEMBER'
  | 'ADMIN';

export interface PortalUser {
  id: string;
  email: string;
  fullName: string;
  role: StatutoryRole;
  regionId?: string;
  regionCode?: string;
  institutionId?: string;
}

interface AppContextValue {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: TranslationDictionary;
  user: PortalUser | null;
  accessToken: string | null;
  isAuthReady: boolean;
  loginWithApi: (email: string, password: string) => Promise<PortalUser>;
  logout: () => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  activeNavKey: string;
  setActiveNavKey: (key: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const STORAGE_KEY_TOKEN = 'samay_portal_jwt';
const STORAGE_KEY_USER = 'samay_portal_user';
const STORAGE_KEY_THEME = 'samay_portal_theme';
const STORAGE_KEY_LOCALE = 'samay_portal_locale';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function normalizeRole(rawRole: string): StatutoryRole {
  if (rawRole === 'ADMIN' || rawRole === 'SUPER_ADMIN') return 'ADMIN';
  if (rawRole === 'BUREAU_OFFICER' || rawRole === 'BUREAU_HEAD') return 'BUREAU_OFFICER';
  if (rawRole === 'REGIONAL_OFFICER') return 'REGIONAL_OFFICER';
  if (
    rawRole === 'COMMITTEE_MEMBER' ||
    rawRole === 'SCRUTINY_MEMBER' ||
    rawRole === 'EVC_EXPERT'
  ) {
    return 'COMMITTEE_MEMBER';
  }
  return 'INSTITUTION';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [locale, setLocaleState] = useState<Locale>('en');
  const [user, setUser] = useState<PortalUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeNavKey, setActiveNavKey] = useState('overview');

  const applyThemeToDom = useCallback((nextTheme: 'light' | 'dark') => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', nextTheme);
    if (nextTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const applyLocaleToDom = useCallback((nextLocale: Locale) => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('lang', nextLocale);
  }, []);

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(STORAGE_KEY_THEME) as 'light' | 'dark' | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
        applyThemeToDom(savedTheme);
      } else {
        applyThemeToDom('light');
      }

      const savedLocale = window.localStorage.getItem(STORAGE_KEY_LOCALE) as Locale | null;
      if (savedLocale === 'en' || savedLocale === 'hi') {
        setLocaleState(savedLocale);
        applyLocaleToDom(savedLocale);
      } else {
        applyLocaleToDom('en');
      }

      const savedToken = window.localStorage.getItem(STORAGE_KEY_TOKEN);
      const savedUserJson = window.localStorage.getItem(STORAGE_KEY_USER);

      if (savedToken && savedUserJson) {
        const parsedUser = JSON.parse(savedUserJson) as PortalUser;
        setAccessToken(savedToken);
        setUser(parsedUser);

        // Verify session against live /auth/me endpoint
        fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        })
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              if (data?.user) {
                const refreshedUser: PortalUser = {
                  id: data.user.id,
                  email: data.user.email,
                  fullName: data.user.fullName,
                  role: normalizeRole(
                    Array.isArray(data.user.roles) && data.user.roles[0]
                      ? data.user.roles[0]
                      : data.user.role,
                  ),
                  regionId: data.user.regionId,
                  regionCode: data.user.regionCode,
                  institutionId: data.user.institutionId,
                };
                setUser(refreshedUser);
                window.localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(refreshedUser));
              }
            }
          })
          .catch(() => {
            // Keep cached session if offline
          });
      }
    } finally {
      setIsAuthReady(true);
    }
  }, [applyThemeToDom, applyLocaleToDom]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const setTheme = useCallback(
    (nextTheme: 'light' | 'dark') => {
      setThemeState(nextTheme);
      applyThemeToDom(nextTheme);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY_THEME, nextTheme);
      }
    },
    [applyThemeToDom],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      setLocaleState(nextLocale);
      applyLocaleToDom(nextLocale);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY_LOCALE, nextLocale);
      }
    },
    [applyLocaleToDom],
  );

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'en' ? 'hi' : 'en');
  }, [locale, setLocale]);

  const loginWithApi = useCallback(async (email: string, password: string): Promise<PortalUser> => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || 'Invalid credentials');
      }

      const data = await res.json();
      const token: string = data.accessToken || data.access_token;

      // Also call GET /auth/me to verify token against Phase 1 API
      const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = meRes.ok ? await meRes.json() : data;
      const apiUser = meData.user || data.user;

      const resolvedRole = normalizeRole(
        Array.isArray(apiUser.roles) && apiUser.roles[0] ? apiUser.roles[0] : apiUser.role,
      );

      const portalUser: PortalUser = {
        id: apiUser.id,
        email: apiUser.email,
        fullName: apiUser.fullName,
        role: resolvedRole,
        regionId: apiUser.regionId,
        regionCode: apiUser.regionCode || (resolvedRole === 'REGIONAL_OFFICER' ? 'WRO' : undefined),
        institutionId: apiUser.institutionId,
      };

      setAccessToken(token);
      setUser(portalUser);
      setActiveNavKey('overview');
      window.localStorage.setItem(STORAGE_KEY_TOKEN, token);
      window.localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(portalUser));
      return portalUser;
    } catch (err) {
      // Fallback only if API server is unreachable during isolated UI preview
      const matchedDemo = DEMO_ROLE_ACCOUNTS.find(
        (d) => d.email.toLowerCase() === normalizedEmail && d.password === password,
      );
      if (matchedDemo && err instanceof TypeError) {
        const fallbackUser: PortalUser = {
          id: `demo-${matchedDemo.role.toLowerCase()}`,
          email: matchedDemo.email,
          fullName: matchedDemo.personName,
          role: matchedDemo.role,
          regionCode: matchedDemo.role === 'REGIONAL_OFFICER' ? 'WRO' : undefined,
        };
        setAccessToken('offline-demo-jwt');
        setUser(fallbackUser);
        setActiveNavKey('overview');
        window.localStorage.setItem(STORAGE_KEY_TOKEN, 'offline-demo-jwt');
        window.localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(fallbackUser));
        return fallbackUser;
      }
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY_TOKEN);
      window.localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        locale,
        setLocale,
        toggleLocale,
        t: TRANSLATIONS[locale],
        user,
        accessToken,
        isAuthReady,
        loginWithApi,
        logout,
        isCommandPaletteOpen,
        setCommandPaletteOpen,
        activeNavKey,
        setActiveNavKey,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

