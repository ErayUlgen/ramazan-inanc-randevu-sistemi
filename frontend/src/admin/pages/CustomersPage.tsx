import { CalendarPlusIcon } from "@phosphor-icons/react/dist/csr/CalendarPlus";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { NoteIcon } from "@phosphor-icons/react/dist/csr/Note";
import { PhoneIcon } from "@phosphor-icons/react/dist/csr/Phone";
import { UserIcon } from "@phosphor-icons/react/dist/csr/User";
import { LockKeyIcon as LockKeyhole } from "@phosphor-icons/react/dist/csr/LockKey";
import { LockOpenIcon as LockOpen } from "@phosphor-icons/react/dist/csr/LockOpen";
import { useEffect, useState } from "react";
import type { AdminSection } from "../components/AdminHeader";
import { AdminErrorBanner } from "../components/AdminErrorBanner";
import { AdminPageFrame } from "../components/AdminPageFrame";
import type {
  AdminCustomerDetail,
  AdminCustomerSearchItem,
} from "../admin.types";
import {
  getAdminCustomer,
  searchAdminCustomers,
  updateAdminCustomer,
  updateCustomerOnlineBookingAccess,
} from "../api/adminApi";
import { formatDateShort, formatMoney, formatTime } from "../lib/adminFormat";
import { Button } from "../../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { toast } from "sonner";
import { CustomerMemoryPanel } from "../components/CustomerMemoryPanel";

type Props = {
  onLogout: () => void;
  onNavigate: (section: AdminSection) => void;
  onCreateBooking: (customer: { fullName: string; phone: string }) => void;
};

export function CustomersPage({
  onLogout,
  onNavigate,
  onCreateBooking,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminCustomerSearchItem[]>([]);
  const [selected, setSelected] = useState<AdminCustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restrictionOpen, setRestrictionOpen] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState("");
  const [restrictionSaving, setRestrictionSaving] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(true);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void searchAdminCustomers(value)
        .then((response) => {
          if (active) setResults(response.items);
        })
        .catch((reason: unknown) => {
          if (active)
            setError(
              reason instanceof Error
                ? reason.message
                : "Müşteriler aranamadı.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 260);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const openCustomer = (id: string) => {
    setDetailLoading(true);
    setError(null);
    void getAdminCustomer(id)
      .then((customer) => {
        setSelected(customer);
        setNote(customer.internalNote ?? "");
        setDirectoryOpen(false);
      })
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Müşteri detayı yüklenemedi.",
        ),
      )
      .finally(() => setDetailLoading(false));
  };

  return (
    <AdminPageFrame
      section="customers"
      eyebrow="Salon ilişkileri"
      title="Müşteriler"
      description="Müşteriyi bulun; randevularını, tercihlerini ve salon notlarını tek profilden yönetin."
      onLogout={onLogout}
      onNavigate={onNavigate}
    >
      <section
        className={`customer-workspace${selected ? " has-selection" : ""}${
          directoryOpen ? " is-directory-open" : ""
        }`}
      >
        <div className="customer-search-panel">
          <header className="customer-directory-heading">
            <span>
              <strong>Müşteri dizini</strong>
              <small>İsim veya telefonla hızlıca bulun.</small>
            </span>
            {selected && (
              <button
                type="button"
                className="customer-directory-done"
                onClick={() => setDirectoryOpen(false)}
              >
                Profili göster
              </button>
            )}
          </header>
          <label className="admin-search-field customer-directory-search">
            <span>Müşteri ara</span>
            <MagnifyingGlassIcon size={20} />
            <input
              id="admin-customer-search"
              name="customerSearch"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ad soyad veya 05xx…"
              autoFocus
            />
          </label>
          {loading && (
            <p className="admin-inline-loading">
              <i /> Müşteriler aranıyor
            </p>
          )}
          {!loading && query.trim().length >= 2 && !results.length && (
            <div className="admin-empty-state compact">
              <UserIcon size={25} />
              <strong>Eşleşen müşteri yok</strong>
              <p>
                Yeni müşteri ilk randevusu oluşturulurken otomatik kaydedilir.
              </p>
            </div>
          )}
          {!loading && query.trim().length < 2 && (
            <div className="admin-empty-state compact">
              <MagnifyingGlassIcon size={25} />
              <strong>Aramaya başlayın</strong>
              <p>En az iki karakter veya telefonun ilk rakamlarını yazın.</p>
            </div>
          )}
          <div className="customer-result-list">
            {results.map((customer) => (
              <button
                type="button"
                key={customer.id}
                className={selected?.id === customer.id ? "is-selected" : ""}
                onClick={() => openCustomer(customer.id)}
              >
                <span className="admin-monogram" aria-hidden="true">
                  {initials(customer.fullName)}
                </span>
                <span>
                  <strong>{customer.fullName}</strong>
                  <small>{customer.phone}</small>
                </span>
                <em>
                  {customer.recentBookings.length
                    ? `${customer.recentBookings.length} son kayıt`
                    : "Yeni müşteri"}
                </em>
              </button>
            ))}
          </div>
        </div>

        <div className="customer-detail-panel">
          {detailLoading && (
            <div className="admin-skeleton admin-skeleton--timeline" />
          )}
          {!detailLoading && !selected && (
            <div className="admin-empty-state">
              <UserIcon size={28} weight="duotone" />
              <strong>Müşteri detayını seçin</strong>
              <p>Geçmiş randevular ve ziyaret bilgileri burada açılır.</p>
            </div>
          )}
          {!detailLoading && selected && (
            <>
              <header className="customer-detail-hero">
                <span className="admin-monogram">
                  {initials(selected.fullName)}
                </span>
                <span className="customer-detail-identity">
                  <h2>{selected.fullName}</h2>
                  <a href={`tel:${selected.phone}`}>
                    <PhoneIcon size={17} /> {selected.phone}
                  </a>
                </span>
                <div className="customer-detail-actions">
                  <Button
                    type="button"
                    variant="outline"
                    className="customer-change-button"
                    onClick={() => setDirectoryOpen(true)}
                  >
                    <MagnifyingGlassIcon />
                    Müşteri değiştir
                  </Button>
                  <Button
                    type="button"
                    className="customer-new-booking"
                    onClick={() =>
                      onCreateBooking({
                        fullName: selected.fullName,
                        phone: selected.phone,
                      })
                    }
                  >
                    <CalendarPlusIcon size={18} weight="bold" />
                    Yeni randevu
                  </Button>
                  <Button
                    type="button"
                    variant={
                      selected.onlineBookingBlockedAt
                        ? "outline"
                        : "destructive"
                    }
                    onClick={() => {
                      setRestrictionReason("");
                      setRestrictionOpen(true);
                    }}
                  >
                    {selected.onlineBookingBlockedAt ? (
                      <LockOpen />
                    ) : (
                      <LockKeyhole />
                    )}
                    {selected.onlineBookingBlockedAt
                      ? "Online rezervasyonu aç"
                      : "Online rezervasyonu kapat"}
                  </Button>
                </div>
              </header>
              <dl className="customer-metrics">
                <div>
                  <dt>Toplam kayıt</dt>
                  <dd>{selected.summary.totalBookings}</dd>
                </div>
                <div>
                  <dt>Geçmiş ziyaret</dt>
                  <dd>{selected.summary.pastVisitTotal}</dd>
                </div>
                <div>
                  <dt>Gelmedi</dt>
                  <dd>{selected.summary.noShowTotal}</dd>
                </div>
                <div>
                  <dt>İptal</dt>
                  <dd>{selected.summary.cancelledTotal}</dd>
                </div>
                <div className="customer-metric--wide">
                  <dt>Son uzman</dt>
                  <dd>{selected.summary.lastProfessionalName ?? "—"}</dd>
                </div>
                <div
                  className={
                    selected.onlineBookingBlockedAt ? "is-danger" : "is-success"
                  }
                >
                  <dt>Online rezervasyon</dt>
                  <dd>
                    {selected.onlineBookingBlockedAt ? "Kapalı" : "Açık"}
                  </dd>
                </div>
              </dl>
              {selected.onlineBookingBlockedAt && (
                <section className="customer-booking-restriction">
                  <LockKeyhole />
                  <span>
                    <strong>Online rezervasyon kapalı</strong>
                    <small>{selected.onlineBookingBlockReason}</small>
                  </span>
                </section>
              )}
              <section className="customer-note-editor">
                <header>
                  <span>
                    <NoteIcon size={19} />
                    <strong>Salon içi not</strong>
                  </span>
                  <small>{note.length}/1000</small>
                </header>
                <textarea
                  id="admin-customer-internal-note"
                  name="internalNote"
                  aria-label="Salon içi not"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={1000}
                  placeholder="Tercihler veya operasyon için gerekli kısa not…"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    savingNote || note === (selected.internalNote ?? "")
                  }
                  onClick={() => {
                    setSavingNote(true);
                    void updateAdminCustomer(selected.id, {
                      internalNote: note,
                    })
                      .then((updated) =>
                        setSelected((current) =>
                          current
                            ? { ...current, internalNote: updated.internalNote }
                            : current,
                        ),
                      )
                      .catch((reason: unknown) =>
                        setError(
                          reason instanceof Error
                            ? reason.message
                            : "Not kaydedilemedi.",
                        ),
                      )
                      .finally(() => setSavingNote(false));
                  }}
                >
                  {savingNote ? "Kaydediliyor…" : "Notu kaydet"}
                </Button>
              </section>
              <CustomerMemoryPanel customer={selected} onError={setError} />
              <div className="customer-booking-columns">
                <CustomerBookings
                  title="Gelecek randevular"
                  items={selected.futureBookings}
                />
                <CustomerBookings
                  title="Geçmiş ziyaretler"
                  items={selected.pastBookings}
                />
              </div>
            </>
          )}
        </div>
      </section>
      {error && (
        <AdminErrorBanner
          title="Müşteri bilgileri güncellenemedi"
          error={error}
          fallback="İşlemi şu an tamamlayamadık. Bilgileri kontrol edip yeniden deneyebilirsin."
        />
      )}
      <AlertDialog open={restrictionOpen} onOpenChange={setRestrictionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selected?.onlineBookingBlockedAt
                ? "Online rezervasyon yeniden açılsın mı?"
                : "Online rezervasyon kapatılsın mı?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selected?.onlineBookingBlockedAt
                ? "Müşteri yeniden online randevu talebi oluşturabilecek."
                : "Mevcut randevular ve müşteri hesabı etkilenmez. Telefonla veya yönetici tarafından randevu eklenebilir."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!selected?.onlineBookingBlockedAt && (
            <label className="customer-restriction-reason">
              <span>İç neden</span>
              <textarea
                id="admin-customer-restriction-reason"
                name="restrictionReason"
                value={restrictionReason}
                onChange={(event) => setRestrictionReason(event.target.value)}
                maxLength={300}
                placeholder="Örn. Tekrarlayan habersiz gelmeme"
              />
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                restrictionSaving ||
                (!selected?.onlineBookingBlockedAt &&
                  restrictionReason.trim().length < 3)
              }
              onClick={(event) => {
                event.preventDefault();
                if (!selected) return;
                const blocked = !selected.onlineBookingBlockedAt;
                setRestrictionSaving(true);
                void updateCustomerOnlineBookingAccess(selected.id, {
                  blocked,
                  ...(blocked ? { reason: restrictionReason.trim() } : {}),
                })
                  .then((result) => {
                    setSelected({
                      ...selected,
                      onlineBookingBlockedAt: result.onlineBookingBlockedAt,
                      onlineBookingBlockReason: result.onlineBookingBlockReason,
                    });
                    setRestrictionOpen(false);
                    toast.success(
                      blocked
                        ? "Online rezervasyon kapatıldı."
                        : "Online rezervasyon yeniden açıldı.",
                    );
                  })
                  .catch((reason: unknown) =>
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : "Müşteri erişimi güncellenemedi.",
                    ),
                  )
                  .finally(() => setRestrictionSaving(false));
              }}
            >
              {restrictionSaving
                ? "Güncelleniyor…"
                : selected?.onlineBookingBlockedAt
                  ? "Yeniden aç"
                  : "Online rezervasyonu kapat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageFrame>
  );
}

function CustomerBookings({
  title,
  items,
}: {
  title: string;
  items: AdminCustomerDetail["futureBookings"];
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, 5);

  return (
    <section className="customer-bookings">
      <h3>
        {title}
        <b>{items.length}</b>
      </h3>
      {!items.length && <p className="admin-inline-empty">Kayıt bulunmuyor.</p>}
      {visibleItems.map((booking) => (
        <article key={booking.id}>
          <span className="customer-booking-time">
            <strong>{formatDateShort(booking.startAt)}</strong>
            <small>
              {formatTime(booking.startAt)}–{formatTime(booking.endAt)}
            </small>
          </span>
          <span>
            <strong>
              {booking.items.map((item) => item.serviceName).join(" + ")}
            </strong>
            <small>
              {booking.professional.name} · {booking.totalDurationMinutes} dk
            </small>
          </span>
          <b>{formatMoney(booking.totalPriceKurus)}</b>
        </article>
      ))}
      {items.length > 5 && (
        <Button
          type="button"
          variant="ghost"
          className="customer-bookings__toggle"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Daha az göster" : `${items.length - 5} kayıt daha göster`}
        </Button>
      )}
    </section>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toLocaleUpperCase(
    "tr-TR",
  );
}
