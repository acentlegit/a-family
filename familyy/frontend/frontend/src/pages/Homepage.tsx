import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';
import { FaUsers, FaImages, FaCalendarAlt, FaVideo, FaEdit, FaTimes } from 'react-icons/fa';
import { FiCheck, FiImage } from 'react-icons/fi';
import api, { getApiUrl } from '../config/api';
import {
  GUEST_HOMEPAGE_STORAGE_KEY,
  accountHomepageCacheKey,
  readStoredUserId,
  persistHomepageAsGuestBackup,
  guestPayloadFromCustomization
} from '../constants/homepageStorage';
import './Homepage.css';

type HomepageCustomization = {
  enabled: boolean;
  status?: 'draft' | 'published';
  theme: 'default' | 'light' | 'dark';
  title: string;
  subtitle: string;
  description: string;
  heroImage: string;
  accentColor?: string;
};

const HOMEPAGE_CUSTOMIZE_AFTER_LOGIN_KEY = 'homepage_customize_after_login';
const HOMEPAGE_CUSTOMIZE_DRAFT_KEY = 'homepage_customize_draft';
const DISPLAY_PREFS_KEY = 'fami_home_display_v1';

type HomepageThemeMode = 'brand' | 'light' | 'dark' | 'system';

type DisplayPrefs = {
  heroOverlay: number;
  showFeaturesAside: boolean;
  textScale: number;
  themeMode?: HomepageThemeMode;
  contentSpacing: 'compact' | 'default' | 'relaxed';
};

function readDisplayPrefs(): DisplayPrefs {
  try {
    const raw = sessionStorage.getItem(DISPLAY_PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Record<string, unknown>;
      const tm = p.themeMode;
      const validMode =
        tm === 'brand' || tm === 'light' || tm === 'dark' || tm === 'system' ? tm : undefined;
      const cs = p.contentSpacing;
      const spacing =
        cs === 'compact' || cs === 'relaxed' || cs === 'default' ? cs : 'default';
      return {
        heroOverlay:
          typeof p.heroOverlay === 'number'
            ? Math.min(0.65, Math.max(0.12, p.heroOverlay))
            : 0.35,
        showFeaturesAside: p.showFeaturesAside !== false,
        textScale:
          typeof p.textScale === 'number' ? Math.min(1.2, Math.max(0.88, p.textScale)) : 1,
        themeMode: validMode,
        contentSpacing: spacing
      };
    }
  } catch {
    /* ignore */
  }
  return { heroOverlay: 0.35, showFeaturesAside: true, textScale: 1, contentSpacing: 'default' };
}
const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const resolveImageUrl = (rawUrl?: string) => {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('data:')) return rawUrl;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  const apiUrl = getApiUrl();
  const baseUrl = apiUrl.replace('/api', '');
  if (rawUrl.startsWith('/uploads/')) return `${baseUrl}${rawUrl}`;
  if (rawUrl.startsWith('uploads/')) return `${baseUrl}/${rawUrl}`;
  return `${baseUrl}/uploads/${rawUrl}`;
};

/** Chrome-style colorful grid (15) + custom picker — each pair (theme, accent) is unique for selection */
const SWATCH_PRESETS: {
  theme: HomepageCustomization['theme'];
  accentColor: string;
  preview: string;
}[] = [
  { theme: 'default', accentColor: '', preview: `linear-gradient(135deg, ${colors.primary} 0%, #020617 100%)` },
  { theme: 'default', accentColor: '#3b82f6', preview: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 45%, #1d4ed8 100%)' },
  { theme: 'default', accentColor: '#7c3aed', preview: 'linear-gradient(135deg, #c4b5fd 0%, #7c3aed 50%, #4c1d95 100%)' },
  { theme: 'default', accentColor: '#0f766e', preview: 'linear-gradient(135deg, #5eead4 0%, #0f766e 50%, #134e4a 100%)' },
  { theme: 'default', accentColor: '#c2410c', preview: 'linear-gradient(135deg, #fdba74 0%, #c2410c 50%, #7c2d12 100%)' },
  { theme: 'light', accentColor: '#dbeafe', preview: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 55%, #dbeafe 100%)' },
  { theme: 'light', accentColor: '#38bdf8', preview: 'linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 50%, #0284c7 100%)' },
  { theme: 'light', accentColor: '#f472b6', preview: 'linear-gradient(135deg, #fce7f3 0%, #f9a8d4 50%, #db2777 100%)' },
  { theme: 'light', accentColor: '#6ee7b7', preview: 'linear-gradient(135deg, #ecfdf5 0%, #6ee7b7 50%, #059669 100%)' },
  { theme: 'light', accentColor: '#fde047', preview: 'linear-gradient(135deg, #fef9c3 0%, #fde047 50%, #ca8a04 100%)' },
  { theme: 'dark', accentColor: '', preview: 'linear-gradient(135deg, #334155 0%, #0f172a 55%, #020617 100%)' },
  { theme: 'default', accentColor: '#1e40af', preview: `linear-gradient(135deg, #60a5fa 0%, ${colors.primary} 55%, #172554 100%)` },
  { theme: 'dark', accentColor: '#6366f1', preview: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 45%, #312e81 100%)' },
  { theme: 'dark', accentColor: '#16a34a', preview: 'linear-gradient(135deg, #86efac 0%, #16a34a 45%, #14532d 100%)' },
  { theme: 'dark', accentColor: '#b91c1c', preview: 'linear-gradient(135deg, #fca5a5 0%, #b91c1c 45%, #450a0a 100%)' }
];

function buildPageTheme(theme: HomepageCustomization['theme'], accentHex: string | undefined) {
  const ac = accentHex?.trim();
  if (theme === 'dark') {
    const deep =
      ac === '#000000'
        ? 'linear-gradient(180deg, #000000 0%, #0a0a0a 50%, #111111 100%)'
        : ac
          ? `linear-gradient(135deg, ${ac} 0%, #0a0a0a 45%, #171717 100%)`
          : 'linear-gradient(180deg, #0a0a0a 0%, #171717 45%, #0f0f0f 100%)';
    return {
      background: deep,
      cardBg: 'rgba(23,23,23,0.72)',
      textColor: '#fafafa'
    };
  }
  if (theme === 'light') {
    return {
      background: ac
        ? `linear-gradient(180deg, #ffffff 0%, ${ac}44 55%, #f5f5f5 100%)`
        : 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 50%, #fafafa 100%)',
      cardBg: 'rgba(255,255,255,0.92)',
      textColor: '#0a0a0a'
    };
  }
  return {
    background: ac
      ? `linear-gradient(135deg, ${ac} 0%, ${colors.primary} 50%, #012a55 100%)`
      : `linear-gradient(135deg, ${colors.primary} 0%, #012a55 100%)`,
    cardBg: 'rgba(255,255,255,0.1)',
    textColor: 'white'
  };
}

const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const storedToken = localStorage.getItem('token');
  const storedUser = (() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const activeUser = user || storedUser;
  const isLoggedIn = !!(user || storedToken);
  const [showCustomizeModal, setShowCustomizeModal] = React.useState(false);
  const [drawerEntered, setDrawerEntered] = React.useState(false);
  const heroFileInputRef = React.useRef<HTMLInputElement>(null);
  const [savingCustomization, setSavingCustomization] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<{ type: '' | 'success' | 'error'; text: string }>({ type: '', text: '' });
  const [selectedHeroImage, setSelectedHeroImage] = React.useState<File | null>(null);
  const [previewImage, setPreviewImage] = React.useState('');
  const [removeHeroImage, setRemoveHeroImage] = React.useState(false);
  const [customization, setCustomization] = React.useState<HomepageCustomization>({
    enabled: false,
    status: 'draft',
    theme: 'default',
    title: '',
    subtitle: '',
    description: '',
    heroImage: '',
    accentColor: ''
  });

  const [displayPrefs, setDisplayPrefs] = React.useState<DisplayPrefs>(() => readDisplayPrefs());
  const [prefersDark, setPrefersDark] = React.useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
  );
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setPrefersDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  React.useEffect(() => {
    try {
      sessionStorage.setItem(DISPLAY_PREFS_KEY, JSON.stringify(displayPrefs));
    } catch {
      /* ignore */
    }
  }, [displayPrefs]);

  /** Keep saved theme in sync when visitor uses “Match system”. */
  React.useEffect(() => {
    if (displayPrefs.themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      setCustomization((prev) => {
        const next: HomepageCustomization = {
          ...prev,
          theme: mq.matches ? 'dark' : 'light'
        };
        return next;
      });
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [displayPrefs.themeMode]);

  /** Avoid writing empty initial state into sessionStorage before GET /homepage-customization finishes. */
  const homepageFetchDoneRef = React.useRef(false);

  const fetchCustomization = React.useCallback(async () => {
    homepageFetchDoneRef.current = false;
    try {
      const response = await api.get('/auth/homepage-customization');
      if (response.data?.success && response.data?.data) {
        const data = response.data.data as HomepageCustomization;
        setCustomization(data);
        const uid = readStoredUserId();
        if (uid) {
          try {
            sessionStorage.setItem(accountHomepageCacheKey(uid), JSON.stringify(data));
          } catch {
            // ignore quota
          }
        }
      }
    } catch (error) {
      console.error('Error loading homepage customization:', error);
    } finally {
      homepageFetchDoneRef.current = true;
    }
  }, []);

  React.useEffect(() => {
    if (!isLoggedIn) homepageFetchDoneRef.current = false;
  }, [isLoggedIn]);

  const isPristineDefaultCustomization = (c: HomepageCustomization) =>
    !c.heroImage?.trim() &&
    !c.title?.trim() &&
    !c.subtitle?.trim() &&
    !c.description?.trim() &&
    c.theme === 'default' &&
    !c.accentColor?.trim() &&
    !c.enabled &&
    (c.status === 'draft' || !c.status);

  /** Keep session cache aligned with UI so theme/accent survives logout from any screen. */
  React.useEffect(() => {
    if (!isLoggedIn) return;
    const uid = readStoredUserId();
    if (!uid) return;
    if (!homepageFetchDoneRef.current && isPristineDefaultCustomization(customization)) return;
    try {
      sessionStorage.setItem(accountHomepageCacheKey(uid), JSON.stringify(customization));
    } catch {
      // ignore
    }
  }, [customization, isLoggedIn]);

  React.useEffect(() => {
    if (!selectedHeroImage) {
      setPreviewImage('');
      return;
    }
    const url = URL.createObjectURL(selectedHeroImage);
    setPreviewImage(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedHeroImage]);

  /** Load guest local theme OR refetch account homepage whenever user lands on `/` (e.g. back from Dashboard). */
  React.useEffect(() => {
    if (location.pathname !== '/') return;

    if (!isLoggedIn) {
      // For visitors who are not logged in, always show the default homepage.
      // Do not load any published/guest customization so the landing looks like the default (second image).
      setCustomization({
        enabled: false,
        status: 'draft',
        theme: 'default',
        title: '',
        subtitle: '',
        description: '',
        heroImage: '',
        accentColor: ''
      });
      return;
    }

    const uid = readStoredUserId();
    if (uid) {
      try {
        const cached = sessionStorage.getItem(accountHomepageCacheKey(uid));
        if (cached) {
          const data = JSON.parse(cached) as HomepageCustomization;
          setCustomization(data);
        }
      } catch {
        // ignore
      }
    }
    fetchCustomization();
  }, [location.pathname, isLoggedIn, fetchCustomization]);

  React.useEffect(() => {
    if (!isLoggedIn) return;
    const shouldReopen = sessionStorage.getItem(HOMEPAGE_CUSTOMIZE_AFTER_LOGIN_KEY) === 'true';
    if (!shouldReopen) return;

    sessionStorage.removeItem(HOMEPAGE_CUSTOMIZE_AFTER_LOGIN_KEY);
    const draftRaw = sessionStorage.getItem(HOMEPAGE_CUSTOMIZE_DRAFT_KEY);
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw);
        setCustomization((prev) => ({
          ...prev,
          theme: draft.theme || prev.theme,
          title: draft.title || '',
          subtitle: draft.subtitle || '',
          description: draft.description || '',
          accentColor: draft.accentColor ?? prev.accentColor
        }));
      } catch {
        // Ignore invalid draft payload
      }
    }
    setShowCustomizeModal(true);
  }, [isLoggedIn]);

  React.useEffect(() => {
    if (!showCustomizeModal) {
      setDrawerEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawerEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [showCustomizeModal]);

  const closeCustomizeDrawer = React.useCallback(() => {
    setDrawerEntered(false);
  }, []);

  const onDrawerTransitionEnd = React.useCallback((e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return;
    if (!drawerEntered) {
      setShowCustomizeModal(false);
    }
  }, [drawerEntered]);

  const saveGuestCustomization = async (publish: boolean) => {
    let nextHero = customization.heroImage || '';
    if (selectedHeroImage) {
      nextHero = await readFileAsDataUrl(selectedHeroImage);
    } else if (removeHeroImage) {
      nextHero = '';
    }
    const hasPayload =
      !!(customization.title?.trim()) ||
      !!(customization.subtitle?.trim()) ||
      !!(customization.description?.trim()) ||
      !!nextHero.trim() ||
      (customization.theme != null && customization.theme !== 'default') ||
      !!(customization.accentColor?.trim());
    const payload = {
      theme: customization.theme || 'default',
      title: customization.title || '',
      subtitle: customization.subtitle || '',
      description: customization.description || '',
      accentColor: customization.accentColor || '',
      heroImage: nextHero,
      enabled: publish ? true : hasPayload,
      status: (publish ? 'published' : 'draft') as 'draft' | 'published'
    };
    try {
      localStorage.setItem(GUEST_HOMEPAGE_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        setSaveStatus({
          type: 'error',
          text: 'Image is too large to store in this browser. Use a smaller image or sign in to save to your account.'
        });
        return;
      }
      setSaveStatus({ type: 'error', text: 'Could not save. Try again or sign in.' });
      return;
    }
    setCustomization({
      ...customization,
      heroImage: nextHero,
      enabled: payload.enabled,
      status: payload.status
    });
    setSelectedHeroImage(null);
    setPreviewImage('');
    setRemoveHeroImage(false);
    setSaveStatus({
      type: 'success',
      text: publish
        ? 'Saved on this device. Sign in to sync and show this to all visitors.'
        : 'Saved on this device only. Sign in to sync with your account.'
    });
    if (publish) {
      closeCustomizeDrawer();
    }
  };

  const saveCustomization = async (publish: boolean) => {
    if (!isLoggedIn) {
      setSavingCustomization(true);
      setSaveStatus({ type: '', text: '' });
      try {
        await saveGuestCustomization(publish);
      } finally {
        setSavingCustomization(false);
      }
      return;
    }
    try {
      setSavingCustomization(true);
      setSaveStatus({ type: '', text: '' });

      const hasPayload =
        !!(customization.title?.trim()) ||
        !!(customization.subtitle?.trim()) ||
        !!(customization.description?.trim()) ||
        !!(customization.heroImage?.trim()) ||
        (customization.theme != null && customization.theme !== 'default') ||
        !!(customization.accentColor?.trim()) ||
        !!selectedHeroImage ||
        removeHeroImage;
      const enabledFlag = publish ? true : hasPayload;

      const theme = customization.theme || 'default';
      const title = customization.title || '';
      const subtitle = customization.subtitle || '';
      const description = customization.description || '';
      const accentColor = customization.accentColor || '';
      const status = publish ? 'published' : 'draft';

      let response;
      if (selectedHeroImage) {
        const formData = new FormData();
        formData.append('enabled', enabledFlag ? 'true' : 'false');
        formData.append('status', status);
        formData.append('theme', theme);
        formData.append('title', title);
        formData.append('subtitle', subtitle);
        formData.append('description', description);
        formData.append('accentColor', accentColor);
        formData.append('heroImage', selectedHeroImage);
        if (removeHeroImage) {
          formData.append('removeHeroImage', 'true');
        }
        response = await api.put('/auth/homepage-customization', formData);
      } else {
        const body: Record<string, unknown> = {
          enabled: enabledFlag,
          status,
          theme,
          title,
          subtitle,
          description,
          accentColor
        };
        if (removeHeroImage) {
          body.removeHeroImage = true;
        }
        response = await api.put('/auth/homepage-customization', body);
      }

      if (response.data?.success && response.data?.data) {
        const data = response.data.data as HomepageCustomization;
        setCustomization(data);
        const uid = readStoredUserId();
        if (uid) {
          try {
            sessionStorage.setItem(accountHomepageCacheKey(uid), JSON.stringify(data));
          } catch {
            /* ignore */
          }
        }
        setSelectedHeroImage(null);
        setPreviewImage('');
        setRemoveHeroImage(false);
        setSaveStatus({
          type: 'success',
          text: publish ? 'Homepage published successfully.' : 'Draft saved successfully.'
        });
        if (publish) {
          closeCustomizeDrawer();
        }
      } else {
        setSaveStatus({
          type: 'error',
          text: response.data?.message || 'Save did not return updated data.'
        });
      }
    } catch (error: any) {
      setSaveStatus({
        type: 'error',
        text: error.response?.data?.message || 'Failed to save homepage customization'
      });
    } finally {
      setSavingCustomization(false);
    }
  };

  const handleResetCustomization = async () => {
    if (!isLoggedIn) {
      const defaultPayload: HomepageCustomization = {
        enabled: false,
        status: 'draft',
        theme: 'default',
        title: '',
        subtitle: '',
        description: '',
        heroImage: '',
        accentColor: ''
      };
      // Persist an explicit "default" guest payload so refresh does not re-apply any published public homepage
      try {
        persistHomepageAsGuestBackup(guestPayloadFromCustomization(defaultPayload));
      } catch {
        /* ignore */
      }
      setCustomization(defaultPayload);
      setDisplayPrefs({
        heroOverlay: 0.35,
        showFeaturesAside: true,
        textScale: 1,
        themeMode: undefined,
        contentSpacing: 'default'
      });
      setSelectedHeroImage(null);
      setPreviewImage('');
      setRemoveHeroImage(false);
      setSaveStatus({ type: 'success', text: 'Restored defaults on this device.' });
      closeCustomizeDrawer();
      return;
    }
    try {
      setSavingCustomization(true);
      const response = await api.post('/auth/homepage-customization/reset');
      if (response.data?.success && response.data?.data) {
        const data = response.data.data as HomepageCustomization;
        setCustomization(data);
        setDisplayPrefs((p) => ({ ...p, themeMode: undefined }));
        const uid = readStoredUserId();
        if (uid) {
          try {
            sessionStorage.setItem(accountHomepageCacheKey(uid), JSON.stringify(data));
          } catch {
            // ignore
          }
        }
        setSelectedHeroImage(null);
        setPreviewImage('');
        setRemoveHeroImage(false);
        closeCustomizeDrawer();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reset homepage');
    } finally {
      setSavingCustomization(false);
    }
  };

  const hasSavedCustomizationContent =
    !!(customization?.heroImage?.trim()) ||
    !!(customization?.title?.trim()) ||
    !!(customization?.subtitle?.trim()) ||
    !!(customization?.description?.trim()) ||
    (customization?.theme && customization.theme !== 'default') ||
    !!(customization?.accentColor?.trim());
  const isCustomized =
    customization?.status === 'published' ||
    customization?.enabled === true ||
    (isLoggedIn && customization?.status === 'draft' && hasSavedCustomizationContent) ||
    (!isLoggedIn && hasSavedCustomizationContent);
  const resolvedHeroImage = resolveImageUrl(customization?.heroImage);
  /** Local file preview before save, or saved URL — drives full-page background */
  const previewHeroForBackdrop = previewImage || resolvedHeroImage;
  const showHeroBackdrop =
    !!previewHeroForBackdrop &&
    (!!previewImage || !!(isCustomized && resolvedHeroImage));
  const openCustomize = () => {
    setSaveStatus({ type: '', text: '' });
    setShowCustomizeModal(true);
  };

  const applyThemePreset = (sw: (typeof SWATCH_PRESETS)[number]) => {
    setDisplayPrefs((p) => ({
      ...p,
      themeMode: sw.theme === 'default' ? 'brand' : sw.theme
    }));
    setCustomization((prev) => {
      const next = { ...prev, theme: sw.theme, accentColor: sw.accentColor };
      if (!isLoggedIn) {
        persistHomepageAsGuestBackup(guestPayloadFromCustomization(next));
      }
      return next;
    });
  };

  const applyAccentColor = (hex: string) => {
    setCustomization((prev) => {
      const next = { ...prev, accentColor: hex };
      if (!isLoggedIn) {
        persistHomepageAsGuestBackup(guestPayloadFromCustomization(next));
      }
      return next;
    });
  };

  const resolvedThemeMode = React.useMemo((): HomepageThemeMode => {
    if (displayPrefs.themeMode) return displayPrefs.themeMode;
    const t = customization.theme;
    if (t === 'default') return 'brand';
    if (t === 'light') return 'light';
    return 'dark';
  }, [displayPrefs.themeMode, customization.theme]);

  const effectiveTheme = React.useMemo((): HomepageCustomization['theme'] => {
    if (resolvedThemeMode === 'system') return prefersDark ? 'dark' : 'light';
    if (resolvedThemeMode === 'brand') return 'default';
    return resolvedThemeMode;
  }, [resolvedThemeMode, prefersDark]);

  const applyThemeMode = React.useCallback(
    (mode: HomepageThemeMode) => {
      setDisplayPrefs((p) => ({ ...p, themeMode: mode }));
      const persist = (next: HomepageCustomization) => {
        if (!isLoggedIn) persistHomepageAsGuestBackup(guestPayloadFromCustomization(next));
      };
      if (mode === 'system') {
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setCustomization((prev) => {
          const next: HomepageCustomization = {
            ...prev,
            theme: dark ? 'dark' : 'light'
          };
          persist(next);
          return next;
        });
        return;
      }
      if (mode === 'brand') {
        setCustomization((prev) => {
          const next: HomepageCustomization = { ...prev, theme: 'default', accentColor: '' };
          persist(next);
          return next;
        });
        return;
      }
      if (mode === 'light') {
        setCustomization((prev) => {
          const next: HomepageCustomization = { ...prev, theme: 'light', accentColor: '' };
          persist(next);
          return next;
        });
        return;
      }
      setCustomization((prev) => {
        const next: HomepageCustomization = { ...prev, theme: 'dark', accentColor: '' };
        persist(next);
        return next;
      });
    },
    [isLoggedIn]
  );

  const goToLoginForCustomization = () => {
    const draftPayload = {
      theme: customization.theme,
      title: customization.title,
      subtitle: customization.subtitle,
      description: customization.description,
      accentColor: customization.accentColor
    };
    sessionStorage.setItem(HOMEPAGE_CUSTOMIZE_AFTER_LOGIN_KEY, 'true');
    sessionStorage.setItem(HOMEPAGE_CUSTOMIZE_DRAFT_KEY, JSON.stringify(draftPayload));
    navigate('/login');
  };
  const pageTheme = buildPageTheme(effectiveTheme, customization?.accentColor);
  const mainPadding =
    displayPrefs.contentSpacing === 'compact'
      ? '40px 16px'
      : displayPrefs.contentSpacing === 'relaxed'
        ? '88px 32px'
        : '60px 20px';
  const accentMatchesPreset = SWATCH_PRESETS.some(
    (sw) =>
      sw.theme === customization.theme && (sw.accentColor || '') === (customization.accentColor || '')
  );
  const eyedropperActive = !!customization.accentColor?.trim() && !accentMatchesPreset;
  const heroDim = displayPrefs.heroOverlay;
  const rootBackgroundStyle = showHeroBackdrop
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,${heroDim}), rgba(0,0,0,${heroDim})), url(${previewHeroForBackdrop})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed' as const
      }
    : {
        backgroundImage: pageTheme.background,
        backgroundSize: 'auto',
        backgroundPosition: '0% 0%',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'scroll' as const
      };

  return (
    <div style={{
      minHeight: '100vh',
      ...rootBackgroundStyle,
      color: pageTheme.textColor,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header with Login/Register */}
      <header style={{
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
          Fami
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {isLoggedIn ? (
            <>
              <span style={{ color: pageTheme.textColor, fontSize: '14px' }}>
                Welcome, {activeUser?.firstName || 'User'} {activeUser?.lastName || ''}
              </span>
              <button
                onClick={openCustomize}
                style={{
                  color: 'white',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  fontSize: '14px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Customize
              </button>
              <Link
                to="/dashboard"
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '15px',
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
              >
                Go to Dashboard
              </Link>
              <button
                onClick={() => {
                  const snap = { ...customization };
                  logout();
                  persistHomepageAsGuestBackup({
                    theme: snap.theme || 'default',
                    title: snap.title || '',
                    subtitle: snap.subtitle || '',
                    description: snap.description || '',
                    accentColor: snap.accentColor || '',
                    heroImage: snap.heroImage || '',
                    enabled: !!snap.enabled,
                    status: (snap.status === 'published' ? 'published' : 'draft') as 'draft' | 'published'
                  });
                  navigate('/');
                }}
                style={{
                  color: 'white',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  fontSize: '15px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '15px',
                  padding: '8px 16px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '6px',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Login
              </Link>
              <Link
                to="/register"
                style={{
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '15px',
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
              >
                Register
              </Link>
              <button
                onClick={openCustomize}
                style={{
                  color: 'white',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  fontSize: '14px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Customize
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns:
          isCustomized && displayPrefs.showFeaturesAside ? '1.2fr 0.8fr' : '1fr',
        padding: mainPadding,
        gap: '24px',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: isCustomized ? 'left' : 'center' }}>
          <h1 style={{
            fontSize: `${Math.round((isCustomized ? 44 : 56) * displayPrefs.textScale)}px`,
            fontWeight: 'bold',
            marginBottom: '14px',
            textShadow: '2px 2px 4px rgba(0,0,0,0.25)'
          }}>
            {isCustomized ? (customization.title || 'Welcome to Your Family Space') : 'Welcome to Fami'}
          </h1>
          <p style={{
            fontSize: `${Math.round(20 * displayPrefs.textScale)}px`,
            marginBottom: '18px',
            opacity: 0.95,
            maxWidth: '700px',
            marginLeft: isCustomized ? undefined : 'auto',
            marginRight: isCustomized ? undefined : 'auto',
            textAlign: isCustomized ? 'left' : 'center',
            lineHeight: 1.5
          }}>
            {isCustomized
              ? (customization.subtitle || 'Your personalized homepage')
              : 'Connect with your family, share memories, and stay close no matter where you are.'}
          </p>
          {isCustomized && (
            <p style={{
              fontSize: `${Math.round(17 * displayPrefs.textScale)}px`,
              opacity: 0.9,
              maxWidth: '700px',
              lineHeight: 1.7
            }}>
              {customization.description || 'Add your family description by clicking Customize.'}
            </p>
          )}

          {!isCustomized && (
          <div className="homepage-feature-grid homepage-feature-grid--wide">
          <div className="homepage-feature-card">
            <FaUsers size={40} style={{ marginBottom: '15px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Family Tree</h3>
            <p style={{ opacity: 0.8, fontSize: '14px', margin: 0 }}>
              Build and explore your family tree
            </p>
          </div>

          <div className="homepage-feature-card">
            <FaImages size={40} style={{ marginBottom: '15px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Memories</h3>
            <p style={{ opacity: 0.8, fontSize: '14px', margin: 0 }}>
              Share and preserve family memories
            </p>
          </div>

          <div className="homepage-feature-card">
            <FaCalendarAlt size={40} style={{ marginBottom: '15px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Events</h3>
            <p style={{ opacity: 0.8, fontSize: '14px', margin: 0 }}>
              Plan and celebrate family events
            </p>
          </div>

          <div className="homepage-feature-card">
            <FaVideo size={40} style={{ marginBottom: '15px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Video Calls</h3>
            <p style={{ opacity: 0.8, fontSize: '14px', margin: 0 }}>
              Connect face-to-face with family
            </p>
          </div>
          </div>
          )}

          <div
            className="homepage-hero-cta"
            style={{ justifyContent: isCustomized ? 'flex-start' : 'center' }}
          >
          <button
            onClick={() => {
              if (user) {
                navigate('/dashboard');
              } else {
                navigate('/login');
              }
            }}
            style={{
              padding: '16px 40px',
              fontSize: '18px',
              fontWeight: '600',
              background: 'white',
              color: colors.primary,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Get Started'}
          </button>
          </div>
        </div>

        {isCustomized && displayPrefs.showFeaturesAside && (
          <div style={{
            background: pageTheme.cardBg,
            border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: '16px',
            overflow: 'hidden',
            backdropFilter: 'blur(8px)'
          }}>
            {(previewImage || resolvedHeroImage) ? (
              <img
                src={previewImage || resolvedHeroImage}
                alt="Family hero"
                style={{ width: '100%', height: '330px', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ height: '330px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}>
                Upload a family picture in Customize
              </div>
            )}
            <div style={{ padding: '16px 18px' }}>
              <h3 style={{ margin: '0 0 8px 0' }}>Features</h3>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
                Family Tree, Memories, Events, Media Gallery, Video Calls and more.
              </p>
            </div>
          </div>
        )}
      </main>

      {showCustomizeModal && (
        <div
          className={`homepage-customize-root${drawerEntered ? ' homepage-customize-root--active' : ''}`}
          role="presentation"
        >
          <div
            className={`homepage-customize-backdrop${drawerEntered ? ' homepage-customize-backdrop--visible' : ''}`}
            onClick={closeCustomizeDrawer}
            aria-hidden
          />
          <div
            className={`homepage-customize-drawer${drawerEntered ? ' homepage-customize-drawer--open' : ''}`}
            onTransitionEnd={onDrawerTransitionEnd}
            role="dialog"
            aria-modal="true"
            aria-labelledby="homepage-customize-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="homepage-customize-drawer-inner">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 18px 12px',
                  borderBottom: '1px solid #e2e8f0',
                  flexShrink: 0,
                  background: '#ffffff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaEdit size={18} style={{ opacity: 0.85, color: '#334155' }} aria-hidden />
                  <h2 id="homepage-customize-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                    Customize
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeCustomizeDrawer}
                  aria-label="Close"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    padding: '8px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="homepage-customize-scroll">
                <p style={{ margin: '12px 0 16px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                  {isLoggedIn
                    ? 'Changes apply to your homepage after you save. Publish when you want everyone to see it.'
                    : 'You can customize without an account — Save stores this on this browser only.'}
                </p>

                {!isLoggedIn && (
                  <div
                    style={{
                      marginBottom: '14px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1e3a5f',
                      fontSize: '13px',
                      lineHeight: 1.45,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <span>
                      Sign in to save your homepage to your account, sync across devices, and show it to all visitors.
                    </span>
                    <button
                      type="button"
                      onClick={goToLoginForCustomization}
                      style={{
                        alignSelf: 'flex-start',
                        border: 'none',
                        background: '#8ab4f8',
                        color: '#202124',
                        borderRadius: '6px',
                        padding: '8px 14px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px'
                      }}
                    >
                      Sign in
                    </button>
                  </div>
                )}
                {saveStatus.text && (
                  <div
                    style={{
                      marginBottom: '14px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: saveStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${saveStatus.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                      color: saveStatus.type === 'success' ? '#047857' : '#b91c1c',
                      fontSize: '13px'
                    }}
                  >
                    {saveStatus.text}
                  </div>
                )}

                <section className="homepage-customize-panel" style={{ marginBottom: '18px' }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Appearance
                  </h3>
                  <div
                    style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      background: '#f1f5f9',
                      marginBottom: '12px'
                    }}
                  >
                    {(previewImage || customization.heroImage) && !removeHeroImage ? (
                      <img
                        src={previewImage || resolveImageUrl(customization.heroImage)}
                        alt="Current homepage background"
                        style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div
                        style={{
                          height: '120px',
                          backgroundImage: pageTheme.background,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: effectiveTheme === 'light' ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.7)',
                          fontSize: '13px'
                        }}
                      >
                        No background image yet
                      </div>
                    )}
                  </div>
                  <input
                    ref={heroFileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      setSelectedHeroImage(e.target.files?.[0] || null);
                      if (e.target.files?.[0]) setRemoveHeroImage(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => heroFileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '999px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#202124',
                      background: '#8ab4f8'
                    }}
                  >
                    <FiImage size={16} aria-hidden />
                    Change background
                  </button>
                  {(customization.heroImage || previewImage) && (
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '12px',
                        fontSize: '12px',
                        color: '#b91c1c',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={removeHeroImage}
                        onChange={(e) => setRemoveHeroImage(e.target.checked)}
                      />
                      Remove image on next save
                    </label>
                  )}
                </section>

                <section className="homepage-customize-panel" style={{ marginBottom: '18px' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Theme
                  </h3>
                  <label htmlFor="homepage-theme-mode" className="homepage-customize-section-hint" style={{ display: 'block', marginBottom: '8px', color: '#64748b' }}>
                    Light, dark, brand, or match this device
                  </label>
                  <select
                    id="homepage-theme-mode"
                    className="homepage-customize-select"
                    value={resolvedThemeMode}
                    onChange={(e) => applyThemeMode(e.target.value as HomepageThemeMode)}
                    aria-label="Homepage theme"
                  >
                    <option value="brand">Brand — deep navy</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">Match system</option>
                  </select>
                </section>

                <section className="homepage-customize-panel" style={{ marginBottom: '22px' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Color &amp; accents
                  </h3>
                  <p className="homepage-customize-section-hint" style={{ marginTop: 0, marginBottom: '12px' }}>
                    Choose a palette below or use the custom color picker for any hex.
                  </p>
                  <div className="homepage-swatch-grid">
                    {SWATCH_PRESETS.map((sw, idx) => {
                      const selected =
                        customization.theme === sw.theme &&
                        (sw.accentColor || '') === (customization.accentColor || '');
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`homepage-swatch${selected ? ' homepage-swatch--selected' : ''}`}
                          style={{
                            backgroundImage: sw.preview,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                          }}
                          onClick={() => applyThemePreset(sw)}
                          aria-label={`Theme preset ${idx + 1}`}
                          aria-pressed={selected}
                        >
                          {selected ? <FiCheck className="homepage-swatch-check" aria-hidden /> : null}
                        </button>
                      );
                    })}
                    <label
                      className={`homepage-swatch homepage-swatch--eyedropper${
                        eyedropperActive ? ' homepage-swatch--selected' : ''
                      }`}
                      title="Pick a custom accent color"
                    >
                      <input
                        type="color"
                        className="homepage-swatch-color-input"
                        value={
                          /^#[0-9A-Fa-f]{6}$/.test(customization.accentColor?.trim() || '')
                            ? customization.accentColor!
                            : '#737373'
                        }
                        onChange={(e) => applyAccentColor(e.target.value)}
                        aria-label="Custom accent color"
                      />
                      <svg
                        className="homepage-swatch-icon"
                        aria-hidden
                        viewBox="0 0 24 24"
                        width={18}
                        height={18}
                        fill="currentColor"
                      >
                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                      </svg>
                    </label>
                  </div>
                </section>

                <section className="homepage-customize-panel" style={{ marginBottom: '22px' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Layout &amp; display
                  </h3>
                  <p className="homepage-customize-section-hint" style={{ marginTop: 0, marginBottom: '14px' }}>
                    These apply on this browser only until we sync them to your account.
                  </p>
                  <label htmlFor="homepage-page-spacing" style={{ display: 'block', fontSize: '13px', color: '#334155', marginBottom: '8px', fontWeight: 500 }}>
                    Page spacing
                  </label>
                  <select
                    id="homepage-page-spacing"
                    className="homepage-customize-select"
                    style={{ marginBottom: '16px' }}
                    value={displayPrefs.contentSpacing}
                    onChange={(e) =>
                      setDisplayPrefs((p) => ({
                        ...p,
                        contentSpacing: e.target.value as DisplayPrefs['contentSpacing']
                      }))
                    }
                    aria-label="Main content padding"
                  >
                    <option value="compact">Compact</option>
                    <option value="default">Balanced</option>
                    <option value="relaxed">Spacious</option>
                  </select>
                  {showHeroBackdrop && (
                    <div style={{ marginBottom: '16px' }}>
                      <label htmlFor="homepage-hero-dim" style={{ display: 'block', fontSize: '13px', color: '#334155', marginBottom: '8px', fontWeight: 500 }}>
                        Photo backdrop dim ({Math.round(displayPrefs.heroOverlay * 100)}%)
                      </label>
                      <input
                        id="homepage-hero-dim"
                        type="range"
                        className="homepage-customize-range"
                        min={0.12}
                        max={0.6}
                        step={0.02}
                        value={displayPrefs.heroOverlay}
                        onChange={(e) =>
                          setDisplayPrefs((p) => ({ ...p, heroOverlay: Number(e.target.value) }))
                        }
                      />
                    </div>
                  )}
                  <label className="homepage-customize-toggle" style={{ marginBottom: '12px' }}>
                    <span>Show features card when homepage is customized</span>
                    <input
                      type="checkbox"
                      checked={displayPrefs.showFeaturesAside}
                      onChange={(e) =>
                        setDisplayPrefs((p) => ({ ...p, showFeaturesAside: e.target.checked }))
                      }
                    />
                  </label>
                  <label htmlFor="homepage-text-scale" style={{ display: 'block', fontSize: '13px', color: '#334155', marginBottom: '8px', fontWeight: 500 }}>
                    Headline size
                  </label>
                  <select
                    id="homepage-text-scale"
                    className="homepage-customize-select"
                    value={
                      displayPrefs.textScale <= 0.94 ? 'compact' : displayPrefs.textScale >= 1.1 ? 'large' : 'default'
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      setDisplayPrefs((p) => ({
                        ...p,
                        textScale: v === 'compact' ? 0.92 : v === 'large' ? 1.12 : 1
                      }));
                    }}
                  >
                    <option value="compact">Compact</option>
                    <option value="default">Balanced</option>
                    <option value="large">Large</option>
                  </select>
                </section>

                <section className="homepage-customize-panel" style={{ marginBottom: '18px' }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Text
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      className="homepage-customize-input"
                      type="text"
                      placeholder="Homepage title"
                      value={customization.title || ''}
                      onChange={(e) => setCustomization({ ...customization, title: e.target.value })}
                    />
                    <input
                      className="homepage-customize-input"
                      type="text"
                      placeholder="Short subtitle"
                      value={customization.subtitle || ''}
                      onChange={(e) => setCustomization({ ...customization, subtitle: e.target.value })}
                    />
                    <textarea
                      className="homepage-customize-input homepage-customize-textarea"
                      rows={4}
                      placeholder="Family description"
                      value={customization.description || ''}
                      onChange={(e) => setCustomization({ ...customization, description: e.target.value })}
                    />
                  </div>
                </section>

                <section className="homepage-customize-panel" style={{ marginBottom: '8px' }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#64748b', letterSpacing: '0.02em' }}>
                    Live preview
                  </h3>
                  <div
                    style={{
                      borderRadius: '12px',
                      padding: '14px',
                      backgroundImage: pageTheme.background,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      color: pageTheme.textColor,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <p style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>
                      {customization.title || 'Welcome to Fami'}
                    </p>
                    <p style={{ margin: '0 0 6px', opacity: 0.95, fontSize: '13px' }}>
                      {customization.subtitle || 'Your personalized family homepage'}
                    </p>
                    <p style={{ margin: '0 0 10px', opacity: 0.88, fontSize: '12px', lineHeight: 1.55 }}>
                      {customization.description || 'Add your family description here.'}
                    </p>
                    {(previewImage || customization.heroImage) && !removeHeroImage ? (
                      <img
                        src={previewImage || resolveImageUrl(customization.heroImage)}
                        alt=""
                        style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                    ) : (
                      <div
                        style={{
                          height: '88px',
                          borderRadius: '8px',
                          background: 'rgba(15,23,42,0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          opacity: 0.9
                        }}
                      >
                        Family image
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="homepage-customize-footer">
                <button
                  type="button"
                  onClick={handleResetCustomization}
                  disabled={savingCustomization}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '14px',
                    background: 'transparent',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '14px',
                    cursor: savingCustomization ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  Reset to default homepage
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      disabled={savingCustomization}
                      onClick={() => saveCustomization(false)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: savingCustomization ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {savingCustomization ? 'Saving…' : 'Save draft'}
                    </button>
                    <button
                      type="button"
                      disabled={savingCustomization}
                      onClick={() => saveCustomization(true)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#0f766e',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: savingCustomization ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {savingCustomization ? 'Publishing…' : 'Publish'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        padding: '20px 40px',
        textAlign: 'center',
        background: 'rgba(0,0,0,0.2)',
        fontSize: '14px',
        opacity: 0.8
      }}>
        © 2026 Fami. All rights reserved.
      </footer>
    </div>
  );
};

export default Homepage;
