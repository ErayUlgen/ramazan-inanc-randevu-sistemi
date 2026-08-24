# Route Map

Router: React Router DOM 7, centralized in `frontend/src/App.tsx`.

| URL | Entry | Layout |
| --- | --- | --- |
| `/` | `components/booking/BookingExperience.tsx` | Public `BrandHeader`, intro/media band, booking shell, footer |
| `/hesabim` | `customer-account/CustomerAccountApp.tsx` | Customer account header/nav/footer |
| `/hesabim/profil` | `CustomerProfilePage` inside `CustomerAccountApp.tsx` | Customer account shell |
| `/hesabim/randevular/:publicCode` | `CustomerBookingPage` inside `CustomerAccountApp.tsx` | Customer account shell |
| `/randevum/*` | `LegacyAccountRedirect` | Redirect to `/hesabim` preserving reference |
| `/bekleme-listesi/*` | `waitlist/WaitlistJoinPage.tsx` | Public waitlist shell |
| `/admin` | `admin/AdminDashboard.tsx` through `AdminApp.tsx` | Admin header + command center |
| `/admin/requests` | `admin/pages/RequestsPage.tsx` | Admin page frame |
| `/admin/waitlist` | `admin/pages/WaitlistPage.tsx` | Admin page frame |
| `/admin/customers` | `admin/pages/CustomersPage.tsx` | Admin page frame |
| `/admin/catalog` | `admin/pages/CatalogPage.tsx` | Admin page frame |
| `/admin/schedule` | `admin/pages/SchedulePage.tsx` | Admin page frame |
| `/admin/reports` | `admin/pages/ReportsPage.tsx` | Admin page frame |
| `/admin/settings` | `admin/pages/SettingsPage.tsx` | Admin page frame |

## Full Router Source

```tsx
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import { BookingExperience } from './components/booking/BookingExperience';

const AdminApp = lazy(() => import('./admin/AdminApp').then((module) => ({ default: module.AdminApp })));
const CustomerAccountApp = lazy(() => import('./customer-account/CustomerAccountApp').then((module) => ({ default: module.CustomerAccountApp })));
const WaitlistJoinPage = lazy(() => import('./waitlist/WaitlistJoinPage').then((module) => ({ default: module.WaitlistJoinPage })));

function App() {
  return (
    <Routes>
      <Route path="/" element={<BookingExperience />} />
      <Route path="/hesabim/*" element={<Suspense fallback={<RouteLoader />}><CustomerAccountApp /></Suspense>} />
      <Route path="/randevum/*" element={<LegacyAccountRedirect />} />
      <Route path="/bekleme-listesi/*" element={<Suspense fallback={<RouteLoader />}><WaitlistJoinPage /></Suspense>} />
      <Route path="/admin/*" element={<Suspense fallback={<RouteLoader />}><AdminApp /></Suspense>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LegacyAccountRedirect() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const pathReference = location.pathname.replace(/^\/randevum\/?/, '').split('/')[0];
  const reference = query.get('ref') ?? query.get('reference') ?? query.get('publicCode') ?? query.get('code') ?? pathReference;
  return <Navigate to={reference ? `/hesabim/randevular/${encodeURIComponent(reference)}` : `/hesabim${location.search}`} replace />;
}

function RouteLoader() {
  return <main className="route-loader" aria-label="Ekran hazırlanıyor"><span aria-hidden="true" /><strong>Hazırlanıyor</strong></main>;
}

export default App;
```
