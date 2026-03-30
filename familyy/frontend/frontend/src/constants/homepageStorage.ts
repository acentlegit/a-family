/** Guest (logged out): same shape as saveGuestCustomization in Homepage.tsx */
export const GUEST_HOMEPAGE_STORAGE_KEY = 'fami_homepage_guest_v1';

export const accountHomepageCacheKey = (userId: string) => `fami_homepage_account_${userId}`;

export function readStoredUserId(): string {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return '';
    const p = JSON.parse(raw) as { _id?: string; id?: string };
    return p._id ? String(p._id) : p.id ? String(p.id) : '';
  } catch {
    return '';
  }
}

/** Copy last fetched homepage from session (per user) into guest localStorage — run before clearing auth. */
export function copySessionHomepageCacheToGuestStorage(): void {
  const uid = readStoredUserId();
  if (!uid) return;
  try {
    const cached = sessionStorage.getItem(accountHomepageCacheKey(uid));
    if (!cached) return;
    const data = JSON.parse(cached) as Record<string, unknown>;
    localStorage.setItem(
      GUEST_HOMEPAGE_STORAGE_KEY,
      JSON.stringify({
        theme: data.theme || 'default',
        title: data.title ?? '',
        subtitle: data.subtitle ?? '',
        description: data.description ?? '',
        accentColor: data.accentColor ?? '',
        heroImage: data.heroImage ?? '',
        enabled: data.enabled ?? false,
        status: data.status ?? 'draft'
      })
    );
  } catch {
    // ignore
  }
}

export type GuestHomepagePayload = {
  theme: string;
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
  heroImage: string;
  enabled: boolean;
  status: 'draft' | 'published';
};

export function persistHomepageAsGuestBackup(payload: GuestHomepagePayload): void {
  try {
    localStorage.setItem(GUEST_HOMEPAGE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota
  }
}

/** Build guest payload from current customization state (theme swatches, text, etc.). */
export function guestPayloadFromCustomization(c: {
  theme?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  accentColor?: string;
  heroImage?: string;
  enabled?: boolean;
  status?: string;
}): GuestHomepagePayload {
  return {
    theme: c.theme || 'default',
    title: c.title || '',
    subtitle: c.subtitle || '',
    description: c.description || '',
    accentColor: c.accentColor || '',
    heroImage: c.heroImage || '',
    enabled: !!c.enabled,
    status: c.status === 'published' ? 'published' : 'draft'
  };
}
