import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { PhoneIcon } from "@phosphor-icons/react/dist/csr/Phone";
import { UserIcon } from "@phosphor-icons/react/dist/csr/User";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motionDurations, motionEase } from "../../design-system/motion";
import type {
  AdminBooking,
  AdminBookingBoard,
  AdminBookingSource,
  AdminCustomerSearchItem,
  AdminManagedProfessional,
  AdminManagedService,
} from "../admin.types";
import {
  createAdminBooking,
  createAdminBookingSeries,
  getAdminProfessionals,
  getAdminServices,
  searchAdminCustomers,
} from "../api/adminApi";
import { formatMoney } from "../lib/adminFormat";

type ManualSource = Exclude<AdminBookingSource, "ONLINE">;

type Props = {
  open: boolean;
  board: AdminBookingBoard;
  initialDate: string;
  prefillCustomer?: { fullName: string; phone: string } | null;
  onClose: () => void;
  onCreated: (booking: AdminBooking) => void;
  onSeriesCreated?: (count: number) => void;
};

export function ManualBookingDrawer({
  open,
  board,
  initialDate,
  prefillCustomer,
  onClose,
  onCreated,
  onSeriesCreated,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [source, setSource] = useState<ManualSource>("PHONE");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [services, setServices] = useState<AdminManagedService[]>([]);
  const [professionals, setProfessionals] = useState<
    AdminManagedProfessional[]
  >([]);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<
    "WEEKLY" | "BIWEEKLY" | "FOUR_WEEKLY" | "MONTHLY"
  >("WEEKLY");
  const [occurrenceCount, setOccurrenceCount] = useState(4);
  const [customerResults, setCustomerResults] = useState<
    AdminCustomerSearchItem[]
  >([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate(initialDate);
    setSource("PHONE");
    setFullName(prefillCustomer?.fullName ?? "");
    setPhone(prefillCustomer?.phone ?? "");
    setServiceIds([]);
    setProfessionalId("");
    setStartTime("");
    setCustomerNote("");
    setAdminNote("");
    setNotificationsEnabled(Boolean(prefillCustomer?.phone));
    setRecurring(false);
    setFrequency("WEEKLY");
    setOccurrenceCount(4);
    setCustomerResults([]);
    setLoadingCatalog(true);
    setError(null);
    void Promise.all([
      getAdminServices(board.branch.id),
      getAdminProfessionals(board.branch.id),
    ])
      .then(([nextServices, nextProfessionals]) => {
        setServices(nextServices.filter((service) => service.isActive));
        setProfessionals(
          nextProfessionals.filter((professional) => professional.isActive),
        );
      })
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error ? reason.message : "Katalog yüklenemedi.",
        );
      })
      .finally(() => setLoadingCatalog(false));
  }, [board.branch.id, initialDate, open, prefillCustomer]);

  useEffect(() => {
    if (!open) return;
    const query = phone.trim().length >= 3 ? phone.trim() : fullName.trim();
    if (query.length < 2) {
      setCustomerResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void searchAdminCustomers(query)
        .then((response) => setCustomerResults(response.items.slice(0, 5)))
        .catch(() => setCustomerResults([]));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [fullName, open, phone]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [onClose, open, submitting]);

  const eligibleProfessionals = useMemo(
    () =>
      professionals.filter((professional) =>
        serviceIds.every((serviceId) =>
          professional.serviceIds.includes(serviceId),
        ),
      ),
    [professionals, serviceIds],
  );
  const selectedServices = services.filter((service) =>
    serviceIds.includes(service.id),
  );
  const totalDuration = selectedServices.reduce(
    (total, service) => total + service.durationMinutes,
    0,
  );
  const totalPrice = selectedServices.reduce(
    (total, service) => total + service.priceKurus,
    0,
  );
  const seriesDates = useMemo(
    () =>
      recurring ? generateSeriesDates(date, frequency, occurrenceCount) : [],
    [date, frequency, occurrenceCount, recurring],
  );

  const toggleService = (id: string) => {
    setServiceIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    setProfessionalId("");
    setStartTime("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !fullName.trim() ||
      !serviceIds.length ||
      !professionalId ||
      !startTime
    ) {
      setError("Müşteri, hizmet, uzman ve saat seçimlerini tamamlayın.");
      return;
    }
    if (source === "PHONE" && !phone.trim()) {
      setError("Telefon randevusunda telefon numarası zorunludur.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (recurring) {
        if (serviceIds.length !== 1 || !phone.trim()) {
          setError(
            "Düzenli randevu için tek hizmet ve telefon numarası gereklidir.",
          );
          return;
        }
        const series = await createAdminBookingSeries({
          professionalId,
          serviceId: serviceIds[0],
          startDate: date,
          startTime,
          frequency,
          occurrenceCount,
          idempotencyKey: crypto.randomUUID(),
          fullName: fullName.trim(),
          phone: phone.trim(),
        });
        onSeriesCreated?.(series.occurrenceCount);
        return;
      }
      const booking = await createAdminBooking({
        branchSlug: board.branch.slug,
        source,
        fullName: fullName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        serviceIds,
        professionalId,
        date,
        startTime,
        customerNote: customerNote.trim() || undefined,
        adminNote: adminNote.trim() || undefined,
        notificationsEnabled: Boolean(phone.trim() && notificationsEnabled),
      });
      onCreated(booking);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Randevu oluşturulamadı.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="admin-drawer-layer manual-booking-layer">
          <motion.button
            type="button"
            className="admin-drawer-backdrop"
            aria-label="Yeni randevu formunu kapat"
            onClick={onClose}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.form
            className="booking-drawer manual-booking-drawer"
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-booking-title"
            initial={reduceMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: motionDurations.page, ease: motionEase }}
          >
            <header className="booking-drawer__header">
              <span>
                <small>Salon akışına ekle</small>
                <strong id="manual-booking-title">Yeni randevu</strong>
              </span>
              <button type="button" onClick={onClose} aria-label="Formu kapat">
                <XIcon size={22} weight="bold" />
              </button>
            </header>

            <div className="booking-drawer__body manual-booking-form">
              <section className="admin-form-section">
                <header>
                  <b>1</b>
                  <span>
                    <strong>Kaynak ve müşteri</strong>
                    <small>Randevunun nereden geldiğini belirtin.</small>
                  </span>
                </header>
                <div className="segmented-control">
                  {(
                    [
                      ["PHONE", "Telefon"],
                      ["WALK_IN", "Salondan"],
                      ["ADMIN", "Yönetici"],
                    ] as Array<[ManualSource, string]>
                  ).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={source === value ? "is-selected" : ""}
                      onClick={() => {
                        setSource(value);
                        if (value === "WALK_IN") setNotificationsEnabled(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="admin-form-grid">
                  <label>
                    <span>Ad soyad</span>
                    <div className="admin-input-with-icon">
                      <UserIcon size={18} />
                      <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        maxLength={100}
                        placeholder="Müşteri adı"
                        autoComplete="name"
                      />
                    </div>
                  </label>
                  <label>
                    <span>
                      Telefon{" "}
                      {source === "WALK_IN" && <small>isteğe bağlı</small>}
                    </span>
                    <div className="admin-input-with-icon">
                      <PhoneIcon size={18} />
                      <input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        maxLength={30}
                        placeholder="05xx xxx xx xx"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </div>
                  </label>
                </div>
                {customerResults.length > 0 && (
                  <div
                    className="customer-suggestions"
                    aria-label="Eşleşen müşteriler"
                  >
                    <span>
                      <MagnifyingGlassIcon size={16} /> Kayıtlı müşteriler
                    </span>
                    {customerResults.map((customer) => (
                      <button
                        type="button"
                        key={customer.id}
                        onClick={() => {
                          setFullName(customer.fullName);
                          setPhone(customer.phone);
                          setCustomerResults([]);
                        }}
                      >
                        <strong>{customer.fullName}</strong>
                        <small>{customer.phone}</small>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="admin-form-section">
                <header>
                  <b>2</b>
                  <span>
                    <strong>Hizmet ve uzman</strong>
                    <small>Süre ve fiyat sunucuda tekrar doğrulanır.</small>
                  </span>
                </header>
                {loadingCatalog ? (
                  <div className="admin-skeleton admin-skeleton--cards" />
                ) : (
                  <>
                    <div className="manual-service-grid">
                      {services.map((service) => (
                        <button
                          type="button"
                          key={service.id}
                          className={
                            serviceIds.includes(service.id) ? "is-selected" : ""
                          }
                          onClick={() => toggleService(service.id)}
                        >
                          <span>
                            <strong>{service.name}</strong>
                            <small>{service.durationMinutes} dk</small>
                          </span>
                          <b>{formatMoney(service.priceKurus)}</b>
                          {serviceIds.includes(service.id) && (
                            <CheckCircleIcon size={20} weight="fill" />
                          )}
                        </button>
                      ))}
                    </div>
                    {serviceIds.length > 0 && (
                      <label>
                        <span>Uzman</span>
                        <select
                          value={professionalId}
                          onChange={(event) =>
                            setProfessionalId(event.target.value)
                          }
                        >
                          <option value="">Uzman seçin</option>
                          {eligibleProfessionals.map((professional) => (
                            <option
                              value={professional.id}
                              key={professional.id}
                            >
                              {professional.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </>
                )}
              </section>

              <section className="admin-form-section">
                <header>
                  <b>3</b>
                  <span>
                    <strong>Tarih ve saat</strong>
                    <small>
                      Salon akışına eklemek istediğiniz zamanı yazın.
                    </small>
                  </span>
                </header>
                <div className="admin-form-grid">
                  <label>
                    <span>Tarih</span>
                    <div className="admin-input-with-icon">
                      <CalendarBlankIcon size={18} />
                      <input
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        required
                      />
                    </div>
                  </label>
                  <label>
                    <span>Başlangıç saati</span>
                    <div className="admin-input-with-icon">
                      <ClockIcon size={18} />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        required
                      />
                    </div>
                  </label>
                </div>
                <p className="admin-form-guidance">
                  Manuel kayıtlar doluluk ve salon çalışma saatleriyle
                  sınırlandırılmaz.
                </p>
                <label className="admin-switch-row">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(event) => setRecurring(event.target.checked)}
                    disabled={serviceIds.length !== 1}
                  />
                  <span>
                    <strong>Düzenli randevu serisi</strong>
                    <small>
                      Aynı hizmet ve uzmanla, manuel yetki korunarak birden
                      fazla tarih oluştur.
                    </small>
                  </span>
                </label>
                {recurring && (
                  <>
                    <div className="admin-form-grid manual-series-fields">
                      <label>
                        <span>Sıklık</span>
                        <select
                          value={frequency}
                          onChange={(event) =>
                            setFrequency(event.target.value as typeof frequency)
                          }
                        >
                          <option value="WEEKLY">Her hafta</option>
                          <option value="BIWEEKLY">İki haftada bir</option>
                          <option value="FOUR_WEEKLY">Dört haftada bir</option>
                          <option value="MONTHLY">Her ay</option>
                        </select>
                      </label>
                      <label>
                        <span>Randevu sayısı</span>
                        <input
                          type="number"
                          min={2}
                          max={12}
                          value={occurrenceCount}
                          onChange={(event) =>
                            setOccurrenceCount(
                              Math.min(
                                12,
                                Math.max(2, Number(event.target.value)),
                              ),
                            )
                          }
                        />
                      </label>
                    </div>
                    <div
                      className="manual-series-preview"
                      aria-label="Oluşturulacak randevu tarihleri"
                    >
                      <header>
                        <span>
                          <strong>Seri önizlemesi</strong>
                          <small>
                            Oluşturmadan önce tüm tarihleri kontrol edin.
                          </small>
                        </span>
                        <b>{seriesDates.length} randevu</b>
                      </header>
                      <div>
                        {seriesDates.map((item, index) => (
                          <span key={item}>
                            <b>{index + 1}</b>
                            <span>
                              <strong>{formatSeriesPreviewDate(item)}</strong>
                              <small>{startTime || "Saat seçilmedi"}</small>
                            </span>
                            {index === 0 && <em>Başlangıç</em>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </section>

              <section className="admin-form-section">
                <header>
                  <b>4</b>
                  <span>
                    <strong>Notlar ve bildirim</strong>
                    <small>Yalnız gerekli operasyon bilgisini ekleyin.</small>
                  </span>
                </header>
                <label>
                  <span>
                    Müşteri notu <small>isteğe bağlı</small>
                  </span>
                  <textarea
                    value={customerNote}
                    onChange={(event) => setCustomerNote(event.target.value)}
                    maxLength={1000}
                    placeholder="Müşterinin talebi veya hassasiyeti"
                  />
                </label>
                <label>
                  <span>
                    Yönetici notu <small>yalnız salon ekibi görür</small>
                  </span>
                  <textarea
                    value={adminNote}
                    onChange={(event) => setAdminNote(event.target.value)}
                    maxLength={1000}
                    placeholder="İç operasyon notu"
                  />
                </label>
                <label className="admin-switch-row">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled && Boolean(phone.trim())}
                    onChange={(event) =>
                      setNotificationsEnabled(event.target.checked)
                    }
                    disabled={!phone.trim()}
                  />
                  <span>
                    <strong>SMS bilgilendirmesi</strong>
                    <small>
                      {phone.trim()
                        ? "Randevu ve hatırlatma mesajları kuyruğa alınır."
                        : "Telefon olmadığı için bildirim gönderilemez."}
                    </small>
                  </span>
                </label>
              </section>

              {selectedServices.length > 0 && (
                <aside className="manual-booking-summary">
                  <span>
                    <small>Toplam</small>
                    <strong>{formatMoney(totalPrice)}</strong>
                  </span>
                  <span>
                    <small>Süre</small>
                    <strong>{totalDuration} dk</strong>
                  </span>
                  <span>
                    <small>Saat</small>
                    <strong>{startTime || "—"}</strong>
                  </span>
                </aside>
              )}
              {error && (
                <p className="admin-form-error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <footer className="booking-drawer__actions manual-booking-actions">
              <button
                className="admin-quiet-button"
                type="button"
                onClick={onClose}
                disabled={submitting}
              >
                Vazgeç
              </button>
              <button
                className="admin-primary-button"
                type="submit"
                disabled={submitting || !startTime}
              >
                {submitting
                  ? "Oluşturuluyor…"
                  : recurring
                    ? "Randevu serisini oluştur"
                    : "Randevuyu oluştur"}
              </button>
            </footer>
          </motion.form>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function generateSeriesDates(
  startDate: string,
  frequency: "WEEKLY" | "BIWEEKLY" | "FOUR_WEEKLY" | "MONTHLY",
  occurrenceCount: number,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return [];
  const dates: string[] = [];
  const [year, month, day] = startDate.split("-").map(Number);
  for (let index = 0; index < occurrenceCount; index += 1) {
    if (frequency === "MONTHLY") {
      const targetMonth = new Date(Date.UTC(year, month - 1 + index, 1, 12));
      const lastDay = new Date(
        Date.UTC(
          targetMonth.getUTCFullYear(),
          targetMonth.getUTCMonth() + 1,
          0,
          12,
        ),
      ).getUTCDate();
      targetMonth.setUTCDate(Math.min(day, lastDay));
      dates.push(targetMonth.toISOString().slice(0, 10));
      continue;
    }
    const target = new Date(`${startDate}T12:00:00Z`);
    const interval =
      frequency === "WEEKLY" ? 7 : frequency === "BIWEEKLY" ? 14 : 28;
    target.setUTCDate(target.getUTCDate() + interval * index);
    dates.push(target.toISOString().slice(0, 10));
  }
  return dates;
}

function formatSeriesPreviewDate(date: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
