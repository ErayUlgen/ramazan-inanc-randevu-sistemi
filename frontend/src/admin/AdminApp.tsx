import { useEffect, useState } from "react";
import { getCatalog } from "../lib/api";
import { AdminDashboard } from "./AdminDashboard";
import type { AdminRole } from "./admin.types";
import type { AdminSection } from "./components/AdminHeader";
import { AdminLogin } from "./components/AdminLogin";
import { useAdminSession } from "./hooks/useAdminSession";
import { CatalogPage } from "./pages/CatalogPage";
import { CustomersPage } from "./pages/CustomersPage";
import { SchedulePage } from "./pages/SchedulePage";
import { RequestsPage } from "./pages/RequestsPage";
import { WaitlistPage } from "./pages/WaitlistPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ReviewsPage } from "./pages/ReviewsPage";
import { TeamAccessPage } from "./pages/TeamAccessPage";
import "./styles/adminStudio.css";

const BRANCH_SLUG = "hair-art-ramazan-inanc-denizli";

const PATHS: Record<AdminSection, string> = {
  bookings: "/admin",
  requests: "/admin/requests",
  waitlist: "/admin/waitlist",
  customers: "/admin/customers",
  services: "/admin/services",
  professionals: "/admin/professionals",
  schedule: "/admin/schedule",
  reviews: "/admin/reviews",
  team: "/admin/team-access",
  reports: "/admin/reports",
  settings: "/admin/settings",
};

/**
 * Rol başına erişilebilir bölümler. Bu liste TEK kaynaktır: hem menüden
 * gezinmeyi (navigate) hem de doğrudan URL ile girişi (activeSection) besler.
 * Daha önce aynı liste iki ayrı yerde tekrarlanıyordu; biri güncellenip diğeri
 * unutulduğunda bir rol, tıklayamadığı sayfaya adres çubuğundan girebiliyordu.
 */
const SECTIONS_BY_ROLE: Record<AdminRole, readonly AdminSection[]> = {
  OWNER: Object.keys(PATHS) as AdminSection[],
  RECEPTIONIST: [
    "bookings",
    "requests",
    "waitlist",
    "customers",
    "schedule",
    "reviews",
  ],
  PROFESSIONAL: ["bookings", "reviews"],
};

function allowedSectionsFor(role: AdminRole): readonly AdminSection[] {
  return SECTIONS_BY_ROLE[role] ?? SECTIONS_BY_ROLE.OWNER;
}

function sectionFromPath(): AdminSection {
  const path = window.location.pathname;
  if (path.startsWith("/admin/requests")) return "requests";
  if (path.startsWith("/admin/waitlist")) return "waitlist";
  if (path.startsWith("/admin/customers")) return "customers";
  if (path.startsWith("/admin/services")) return "services";
  if (path.startsWith("/admin/professionals")) return "professionals";
  if (path.startsWith("/admin/schedule")) return "schedule";
  if (path.startsWith("/admin/reviews")) return "reviews";
  if (path.startsWith("/admin/team-access")) return "team";
  if (path.startsWith("/admin/reports")) return "reports";
  if (path.startsWith("/admin/settings")) return "settings";
  return "bookings";
}

export function AdminApp() {
  const session = useAdminSession();
  const [section, setSection] = useState<AdminSection>(sectionFromPath);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [bookingCustomer, setBookingCustomer] = useState<{
    fullName: string;
    phone: string;
  } | null>(null);

  useEffect(() => {
    const pop = () => setSection(sectionFromPath());
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);

  useEffect(() => {
    if (session.state !== "authenticated" || branchId) return;
    void getCatalog(BRANCH_SLUG)
      .then((branch) => {
        setBranchId(branch.id);
        setBranchError(null);
      })
      .catch((reason: unknown) =>
        setBranchError(
          reason instanceof Error
            ? reason.message
            : "Salon bilgisi yüklenemedi.",
        ),
      );
  }, [branchId, session.state]);

  // Rolün erişemeyeceği bir bölüme doğrudan URL ile girilmişse adresi düzelt.
  // Bu düzeltme eskiden render gövdesinde yapılıyordu; render sırasında yan etki
  // çalıştırmak React'in eşzamanlı render modelinde güvenli değildir.
  useEffect(() => {
    if (session.state !== "authenticated") return;
    const currentRole = session.user?.role ?? "OWNER";
    if (allowedSectionsFor(currentRole).includes(section)) return;
    window.history.replaceState({}, "", PATHS.bookings);
    setSection("bookings");
  }, [section, session.state, session.user?.role]);

  const navigate = (next: AdminSection) => {
    const role = session.user?.role ?? "OWNER";
    if (!allowedSectionsFor(role).includes(next)) return;
    window.history.pushState({}, "", PATHS[next]);
    setSection(next);
  };

  if (session.state === "checking") {
    return (
      <main
        className="admin-session-check"
        aria-label="Yönetici oturumu kontrol ediliyor"
      >
        <span className="admin-spinner" />
        <strong>Güvenli oturum kontrol ediliyor</strong>
      </main>
    );
  }

  if (session.state === "guest") {
    return (
      <AdminLogin
        error={session.error}
        submitting={session.submitting}
        onLogin={session.login}
      />
    );
  }

  const shared = {
    onLogout: () => void session.logout(),
    onNavigate: navigate,
  };

  const role = session.user?.role ?? "OWNER";
  const activeSection = allowedSectionsFor(role).includes(section)
    ? section
    : "bookings";

  if (activeSection === "bookings") {
    return (
      <AdminDashboard
        {...shared}
        onSessionExpired={session.expire}
        role={role}
        initialCustomer={bookingCustomer}
        onInitialCustomerConsumed={() => setBookingCustomer(null)}
      />
    );
  }

  if (!branchId) {
    return (
      <main
        className="admin-session-check"
        aria-label="Salon bilgisi yükleniyor"
      >
        <span className="admin-spinner" />
        <strong>{branchError ?? "Salon çalışma alanı hazırlanıyor"}</strong>
      </main>
    );
  }

  if (activeSection === "customers") {
    return (
      <CustomersPage
        {...shared}
        onCreateBooking={(customer) => {
          setBookingCustomer(customer);
          navigate("bookings");
        }}
      />
    );
  }
  if (activeSection === "services") {
    return <CatalogPage {...shared} mode="services" branchId={branchId} />;
  }
  if (activeSection === "professionals") {
    return <CatalogPage {...shared} mode="professionals" branchId={branchId} />;
  }
  if (activeSection === "schedule") {
    return <SchedulePage {...shared} branchId={branchId} />;
  }
  if (activeSection === "requests") {
    return <RequestsPage {...shared} branchId={branchId} />;
  }
  if (activeSection === "waitlist") {
    return <WaitlistPage {...shared} branchId={branchId} />;
  }
  if (activeSection === "reports") {
    return <ReportsPage {...shared} branchId={branchId} />;
  }
  if (activeSection === "reviews") {
    return <ReviewsPage {...shared} role={role} />;
  }
  if (activeSection === "team") {
    return <TeamAccessPage {...shared} branchId={branchId} />;
  }
  return <SettingsPage {...shared} branchId={branchId} />;
}
