# Shared Layouts

## Public Brand Header

Path: `frontend/src/components/booking/BrandHeader.tsx`

```tsx
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { MapPinIcon } from '@phosphor-icons/react/dist/csr/MapPin';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { UserCircleIcon } from '@phosphor-icons/react/dist/csr/UserCircle';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { motionDurations, motionEase } from '../../design-system/motion';
import { StudioWordmark } from '../brand/StudioWordmark';
import type { DataMode } from './booking.types';

export function BrandHeader({ dataMode, href = '#booking' }: { dataMode: DataMode; href?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.header className="brand-header" initial={reduceMotion ? false : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionDurations.page, ease: motionEase }}>
      <motion.a className="wordmark" href={href} aria-label="Ramazan İnanç Hair Art Studio randevu" whileHover={reduceMotion ? undefined : { x: 2 }} whileTap={reduceMotion ? undefined : { scale: 0.985 }}>
        <StudioWordmark />
      </motion.a>
      <div className="brand-header__meta">
        <motion.span><MapPinIcon size={17} weight="bold" /> Denizli</motion.span>
        <motion.span><ClockIcon size={17} weight="bold" /> 10.00–21.00</motion.span>
        <motion.span className="brand-header__secure"><ShieldCheckIcon size={17} weight="duotone" /> Güvenli randevu</motion.span>
        {dataMode === 'preview' && <motion.span className="preview-badge">Tasarım önizlemesi</motion.span>}
        <Link className="brand-header__account" to="/hesabim"><UserCircleIcon size={20} weight="duotone" /><span>Randevularım</span></Link>
      </div>
    </motion.header>
  );
}
```

## Admin Header

Path: `frontend/src/admin/components/AdminHeader.tsx`

```tsx
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowClockwise';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import { SignOutIcon } from '@phosphor-icons/react/dist/csr/SignOut';
import { StudioWordmark } from '../../components/brand/StudioWordmark';

export type AdminSection = 'bookings' | 'requests' | 'waitlist' | 'customers' | 'services' | 'professionals' | 'schedule' | 'reports' | 'settings';
const NAVIGATION: Array<{ id: AdminSection; label: string }> = [
  { id: 'bookings', label: 'Randevular' }, { id: 'requests', label: 'Talepler' },
  { id: 'waitlist', label: 'Bekleme listesi' }, { id: 'customers', label: 'Müşteriler' },
  { id: 'services', label: 'Hizmetler' }, { id: 'professionals', label: 'Uzmanlar' },
  { id: 'schedule', label: 'Çalışma düzeni' }, { id: 'reports', label: 'Raporlar' },
  { id: 'settings', label: 'Ayarlar' },
];

export function AdminHeader({ refreshing, lastUpdatedAt, onRefresh, onLogout, onOpenCustomer, activeSection = 'bookings', onNavigate }: {
  refreshing: boolean; lastUpdatedAt: Date | null; onRefresh: () => void; onLogout: () => void;
  onOpenCustomer: () => void; activeSection?: AdminSection; onNavigate?: (section: AdminSection) => void;
}) {
  return (
    <header className="admin-header">
      <a className="admin-header__brand" href="/" aria-label="Müşteri randevu sayfasına dön"><StudioWordmark /></a>
      <div className="admin-header__title"><span>Salon operasyonu</span><strong>Randevu merkezi</strong></div>
      <div className="admin-header__actions">
        <button className="admin-customer-preview" type="button" onClick={onOpenCustomer}><ArrowSquareOutIcon size={18} weight="bold" /><span>Müşteri görünümü</span></button>
        <span className="admin-sync-state" aria-live="polite"><i />{lastUpdatedAt ? `Güncel · ${lastUpdatedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : refreshing ? 'Güncelleniyor' : 'Sistem hazır'}</span>
        <button className="admin-icon-button" type="button" onClick={onRefresh} disabled={refreshing} aria-label="Randevu panosunu yenile"><ArrowClockwiseIcon size={21} weight="bold" /></button>
        <button className="admin-quiet-button" type="button" onClick={onLogout}><SignOutIcon size={20} weight="bold" /><span>Çıkış</span></button>
      </div>
      {onNavigate && <nav className="admin-primary-nav" aria-label="Yönetici bölümleri">{NAVIGATION.map((item) => <button type="button" key={item.id} className={activeSection === item.id ? 'is-active' : ''} onClick={() => onNavigate(item.id)}>{item.label}</button>)}</nav>}
    </header>
  );
}
```

## Admin Page Frame

Path: `frontend/src/admin/components/AdminPageFrame.tsx`

```tsx
import type { ReactNode } from 'react';
import { AdminHeader, type AdminSection } from './AdminHeader';

export function AdminPageFrame({ section, eyebrow, title, description, onLogout, onNavigate, children, actions }: {
  section: AdminSection; eyebrow: string; title: string; description: string;
  onLogout: () => void; onNavigate: (section: AdminSection) => void; children: ReactNode; actions?: ReactNode;
}) {
  return (
    <div className="admin-shell">
      <AdminHeader refreshing={false} lastUpdatedAt={null} onRefresh={() => undefined} onLogout={onLogout} onOpenCustomer={() => window.location.assign('/')} activeSection={section} onNavigate={onNavigate} />
      <main className="admin-main admin-section-main">
        <header className="admin-section-heading"><span><small>{eyebrow}</small><h1>{title}</h1><p>{description}</p></span>{actions && <div>{actions}</div>}</header>
        {children}
      </main>
    </div>
  );
}
```

## Studio Dock

Path: `frontend/src/components/navigation/StudioDock.tsx`. Conditional floating bridge from public/customer UI to admin when an admin session is already active.
