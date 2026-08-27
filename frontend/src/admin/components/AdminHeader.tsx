import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { ChartBarIcon } from "@phosphor-icons/react/dist/csr/ChartBar";
import { ClipboardTextIcon } from "@phosphor-icons/react/dist/csr/ClipboardText";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { GearIcon } from "@phosphor-icons/react/dist/csr/Gear";
import { HourglassIcon } from "@phosphor-icons/react/dist/csr/Hourglass";
import { ListIcon } from "@phosphor-icons/react/dist/csr/List";
import { ScissorsIcon } from "@phosphor-icons/react/dist/csr/Scissors";
import { SignOutIcon } from "@phosphor-icons/react/dist/csr/SignOut";
import { StarIcon } from "@phosphor-icons/react/dist/csr/Star";
import { UserCircleIcon } from "@phosphor-icons/react/dist/csr/UserCircle";
import { UserGearIcon } from "@phosphor-icons/react/dist/csr/UserGear";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import { useEffect, useRef, useState } from "react";
import { StudioWordmark } from "../../components/brand/StudioWordmark";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import type { AdminRole } from "../admin.types";

type Props = {
  refreshing: boolean;
  lastUpdatedAt: Date | null;
  onRefresh?: () => void;
  onLogout: () => void;
  onOpenCustomer: () => void;
  activeSection?: AdminSection;
  onNavigate?: (section: AdminSection) => void;
  role?: AdminRole;
};

export type AdminSection =
  | "bookings"
  | "requests"
  | "waitlist"
  | "customers"
  | "services"
  | "professionals"
  | "schedule"
  | "reviews"
  | "team"
  | "reports"
  | "settings";

type NavigationItem = {
  id: AdminSection;
  label: string;
  icon: typeof CalendarBlankIcon;
};

type NavigationGroup = {
  id: string;
  label: string;
  items: NavigationItem[];
};

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    id: "operations",
    label: "Operasyon",
    items: [
      {
        id: "bookings" as const,
        label: "Randevular",
        icon: CalendarBlankIcon,
      },
      {
        id: "requests" as const,
        label: "Değişiklikler",
        icon: ClipboardTextIcon,
      },
      {
        id: "waitlist" as const,
        label: "Bekleme listesi",
        icon: HourglassIcon,
      },
      {
        id: "schedule" as const,
        label: "Çalışma düzeni",
        icon: ClockIcon,
      },
    ],
  },
  {
    id: "customers",
    label: "Müşteri",
    items: [
      {
        id: "customers" as const,
        label: "Müşteriler",
        icon: UsersThreeIcon,
      },
      {
        id: "reviews" as const,
        label: "Değerlendirmeler",
        icon: StarIcon,
      },
    ],
  },
  {
    id: "salon",
    label: "Salon",
    items: [
      {
        id: "services" as const,
        label: "Hizmetler",
        icon: ScissorsIcon,
      },
      {
        id: "professionals" as const,
        label: "Uzmanlar",
        icon: UserCircleIcon,
      },
    ],
  },
  {
    id: "management",
    label: "Yönetim",
    items: [
      {
        id: "team" as const,
        label: "Ekip erişimi",
        icon: UserGearIcon,
      },
      {
        id: "reports" as const,
        label: "Raporlar",
        icon: ChartBarIcon,
      },
      {
        id: "settings" as const,
        label: "Ayarlar",
        icon: GearIcon,
      },
    ],
  },
];

const ROLE_LABELS: Record<AdminRole, string> = {
  OWNER: "İşletme sahibi",
  RECEPTIONIST: "Resepsiyon",
  PROFESSIONAL: "Uzman",
};

export function AdminHeader({
  refreshing,
  lastUpdatedAt,
  onRefresh,
  onLogout,
  onOpenCustomer,
  activeSection = "bookings",
  onNavigate,
  role,
}: Props) {
  const activeNavItemRef = useRef<HTMLButtonElement | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const storedIdentity = readStoredIdentity();
  const currentRole = role ?? storedIdentity.role;
  const currentPage =
    NAVIGATION_GROUPS.flatMap((group) => group.items).find(
      (item) => item.id === activeSection,
    )?.label ?? "Randevular";
  const visibleGroups = NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeeSection(currentRole, item.id)),
  })).filter((group) => group.items.length > 0);

  useEffect(() => {
    activeNavItemRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [activeSection]);

  const navigateTo = (section: AdminSection) => {
    setMobileMenuOpen(false);
    onNavigate?.(section);
  };

  const renderNavigation = (className: string, label: string) => (
    <nav className={className} aria-label={label}>
      {visibleGroups.map((group) => (
        <section
          className={`${className}__group`}
          key={group.id}
          aria-labelledby={`${className}-${group.id}`}
        >
          <span
            className={`${className}__group-label`}
            id={`${className}-${group.id}`}
          >
            {group.label}
          </span>
          <div className={`${className}__items`}>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  ref={active ? activeNavItemRef : undefined}
                  className={`${className}__item${active ? " is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => navigateTo(item.id)}
                >
                  <Icon size={19} weight={active ? "fill" : "bold"} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="admin-studio-sidebar" aria-label="Yönetici menüsü">
        <a
          className="admin-studio-sidebar__brand"
          href="/"
        >
          <StudioWordmark />
        </a>

        {onNavigate &&
          renderNavigation("admin-studio-nav", "Yönetici bölümleri")}

        <div className="admin-studio-sidebar__identity">
          <span className="admin-studio-sidebar__avatar" aria-hidden="true">
            <UserCircleIcon size={21} weight="fill" />
          </span>
          <span>
            <strong>{storedIdentity.displayName}</strong>
            <small>{ROLE_LABELS[currentRole]}</small>
          </span>
        </div>
      </aside>

      <header className="admin-studio-topbar">
        <div className="admin-studio-topbar__context">
          {onNavigate && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className="admin-studio-mobile-menu-trigger"
                  type="button"
                  aria-label="Yönetim menüsünü aç"
                >
                  <ListIcon size={22} weight="bold" />
                </button>
              </SheetTrigger>
              <SheetContent
                className="admin-studio-mobile-sheet"
                side="left"
              >
                <SheetHeader className="admin-studio-mobile-sheet__header">
                  {/* aria-label bilinçli olarak yok: erişilebilir ad görünen
                      metinden gelir (bkz. BrandHeader.tsx — sabit aria-label,
                      marka adının CSS ile büyük harfe çevrilmesiyle "HAİR" /
                      "Hair" Türkçe nokta'lı İ yüzünden ayrışıyordu). */}
                  <a href="/">
                    <StudioWordmark />
                  </a>
                  <SheetTitle>Salon yönetimi</SheetTitle>
                  <SheetDescription>
                    {storedIdentity.displayName} · {ROLE_LABELS[currentRole]}
                  </SheetDescription>
                </SheetHeader>
                {renderNavigation(
                  "admin-studio-mobile-nav",
                  "Mobil yönetici bölümleri",
                )}
              </SheetContent>
            </Sheet>
          )}

          {/* Diğer marka bağlantılarının aksine burada aria-label bilinçli
              OLARAK VAR: .admin-studio-mobile-brand bu dar üst barda
              .studio-wordmark__copy'yi (yani "Ramazan İnanç" / "Hair Art
              Studio" metnini) display:none ile gizliyor, geriye yalnız
              alt="" olan dekoratif logo kalıyor — yani görünen metin hiç
              yok, ad görünen metinden türetilemez. Lighthouse'un
              link-name denetimi bunu canlı olarak yakaladı. */}
          <a
            className="admin-studio-mobile-brand"
            href="/"
            aria-label="Müşteri randevu sayfasına dön"
          >
            <StudioWordmark />
          </a>

          <div className="admin-studio-topbar__title">
            <small>Salon yönetimi</small>
            <strong>{currentPage}</strong>
          </div>
        </div>

        <div className="admin-studio-topbar__actions">
          <button
            className="admin-customer-preview admin-studio-action"
            type="button"
            onClick={onOpenCustomer}
            title="Müşteri rezervasyon görünümünü aç"
          >
            <ArrowSquareOutIcon size={18} weight="bold" />
            <span>Müşteri görünümü</span>
          </button>

          {onRefresh && (
            <>
              <span className="admin-sync-state" aria-live="polite">
                <i />
                {lastUpdatedAt
                  ? `Güncel · ${lastUpdatedAt.toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : refreshing
                    ? "Güncelleniyor"
                    : "Sistem hazır"}
              </span>
              <button
                className="admin-icon-button admin-studio-action admin-studio-action--icon"
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Randevu panosunu yenile"
                title="Yenile"
              >
                <ArrowClockwiseIcon
                  className={refreshing ? "is-spinning" : ""}
                  size={20}
                  weight="bold"
                />
              </button>
            </>
          )}

          <button
            className="admin-quiet-button admin-studio-action"
            type="button"
            onClick={onLogout}
            // Erişilebilir ad görünen metinle ("Çıkış") başlamalıdır; aksi halde
            // sesli komut kullanan biri butonu adıyla çağıramaz ve denetim
            // "görünen etiket erişilebilir adla uyuşmuyor" hatası verir.
            aria-label="Çıkış: yönetici oturumunu kapat"
            title="Çıkış"
          >
            <SignOutIcon size={19} weight="bold" />
            <span>Çıkış</span>
          </button>
        </div>
      </header>
    </>
  );
}

function canSeeSection(role: AdminRole, section: AdminSection) {
  if (role === "OWNER") return true;
  if (role === "RECEPTIONIST") {
    return [
      "bookings",
      "requests",
      "waitlist",
      "customers",
      "schedule",
      "reviews",
    ].includes(section);
  }
  return ["bookings", "reviews"].includes(section);
}

function readStoredIdentity(): {
  role: AdminRole;
  displayName: string;
} {
  try {
    const stored = JSON.parse(
      window.sessionStorage.getItem("ri_admin_identity") ?? "{}",
    ) as {
      role?: AdminRole;
      displayName?: string;
      username?: string;
    };
    return {
      role: stored.role ?? "OWNER",
      displayName:
        stored.displayName?.trim() || stored.username?.trim() || "Yönetici",
    };
  } catch {
    return { role: "OWNER", displayName: "Yönetici" };
  }
}
