import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { BookingExperience } from "./components/booking/BookingExperience";
import { AppErrorBoundary } from "./components/system/AppErrorBoundary";

const AdminApp = lazy(() =>
  import("./admin/AdminApp").then((module) => ({ default: module.AdminApp })),
);
const CustomerAccountApp = lazy(() =>
  import("./customer-account/CustomerAccountApp").then((module) => ({
    default: module.CustomerAccountApp,
  })),
);
const WaitlistJoinPage = lazy(() =>
  import("./waitlist/WaitlistJoinPage").then((module) => ({
    default: module.WaitlistJoinPage,
  })),
);
const PublicReviewPage = lazy(() =>
  import("./customer-account/PublicActionPages").then((module) => ({
    default: module.PublicReviewPage,
  })),
);

function App() {
  const location = useLocation();

  return (
    <AppErrorBoundary key={location.key}>
      <Routes>
        <Route path="/" element={<BookingExperience />} />
        <Route
          path="/hesabim/*"
          element={
            <Suspense fallback={<RouteLoader />}>
              <CustomerAccountApp />
            </Suspense>
          }
        />
        <Route path="/randevum/*" element={<LegacyAccountRedirect />} />
        <Route path="/katilim/:token" element={<Navigate to="/hesabim" replace />} />
        <Route
          path="/degerlendir/:token"
          element={
            <Suspense fallback={<RouteLoader />}>
              <PublicReviewPage />
            </Suspense>
          }
        />
        <Route
          path="/bekleme-listesi/*"
          element={
            <Suspense fallback={<RouteLoader />}>
              <WaitlistJoinPage />
            </Suspense>
          }
        />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<RouteLoader />}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppErrorBoundary>
  );
}

function LegacyAccountRedirect() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const pathReference = location.pathname
    .replace(/^\/randevum\/?/, "")
    .split("/")[0];
  const reference =
    query.get("ref") ??
    query.get("reference") ??
    query.get("publicCode") ??
    query.get("code") ??
    pathReference;
  const destination = reference
    ? `/hesabim/randevular/${encodeURIComponent(reference)}`
    : `/hesabim${location.search}`;

  return <Navigate to={destination} replace />;
}

function RouteLoader() {
  return (
    <main className="route-loader" aria-label="Ekran hazırlanıyor">
      <span aria-hidden="true" />
      <strong>Hazırlanıyor</strong>
    </main>
  );
}

export default App;
