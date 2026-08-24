import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motionDurations, motionEase } from "../design-system/motion";
import type { AdminBooking, AdminFilters, AdminRole } from "./admin.types";
import {
  AdminApiError,
  cancelAdminBooking,
  decideAdminBooking,
  previewAdminBookingReschedule,
  rescheduleAdminBooking,
  searchAdminBookings,
} from "./api/adminApi";
import { AdminAgenda } from "./components/AdminAgenda";
import { AdminCommandBar } from "./components/AdminCommandBar";
import { AdminErrorBanner } from "./components/AdminErrorBanner";
import { AdminHeader } from "./components/AdminHeader";
import type { AdminSection } from "./components/AdminHeader";
import { AdminSummary } from "./components/AdminSummary";
import { BookingDetailDrawer } from "./components/BookingDetailDrawer";
import { DayTimeline, TimelineSkeleton } from "./components/DayTimeline";
import { PendingQueue } from "./components/PendingQueue";
import { ManualBookingDrawer } from "./components/ManualBookingDrawer";
import { WeekTimeline } from "./components/WeekTimeline";
import { useBookingBoard } from "./hooks/useBookingBoard";
import { useWeekBoard } from "./hooks/useWeekBoard";
import { useAdminRealtime } from "./hooks/useAdminRealtime";
import {
  bookingSearchText,
  shiftDate,
  todayInIstanbul,
} from "./lib/adminFormat";
import {
  playAdminAlert,
  readAdminNotificationPreferences,
  showDesktopBookingNotification,
} from "./lib/adminNotifications";

const INITIAL_FILTERS: AdminFilters = {
  professionalId: "",
  status: "",
  source: "",
  query: "",
};

const ADMIN_CONTEXT_KEY = "ri_admin_workspace_context";

type StoredAdminContext = {
  date?: string;
  filters?: AdminFilters;
  selectedId?: string | null;
  view?: "day" | "week" | "agenda";
};

function readStoredContext(): StoredAdminContext {
  try {
    return JSON.parse(
      window.sessionStorage.getItem(ADMIN_CONTEXT_KEY) ?? "{}",
    ) as StoredAdminContext;
  } catch {
    return {};
  }
}

function bookingIdFromUrl() {
  return new URLSearchParams(window.location.search).get("booking");
}

function viewFromUrl(): "day" | "week" | "agenda" | null {
  const value = new URLSearchParams(window.location.search).get("view");
  return value === "week" || value === "agenda" || value === "day"
    ? value
    : null;
}

type Props = {
  onLogout: () => void;
  onSessionExpired: () => void;
  onNavigate: (section: AdminSection) => void;
  initialCustomer?: { fullName: string; phone: string } | null;
  onInitialCustomerConsumed?: () => void;
  role: AdminRole;
};

export function AdminDashboard({
  onLogout,
  onSessionExpired,
  onNavigate,
  initialCustomer,
  onInitialCustomerConsumed,
  role,
}: Props) {
  const [initialContext] = useState(readStoredContext);
  const [date, setDate] = useState(
    new URLSearchParams(window.location.search).get("date") ??
      initialContext.date ??
      todayInIstanbul,
  );
  const [filters, setFilters] = useState(() => {
    const stored = initialContext.filters ?? INITIAL_FILTERS;
    const professionalId = new URLSearchParams(window.location.search).get(
      "professionalId",
    );
    return professionalId ? { ...stored, professionalId } : stored;
  });
  const [selected, setSelected] = useState<AdminBooking | null>(null);
  const [selectedIdToRestore, setSelectedIdToRestore] = useState(
    bookingIdFromUrl() ?? initialContext.selectedId ?? null,
  );
  const [mobileView, setMobileView] = useState<"timeline" | "pending">(
    "timeline",
  );
  const [view, setView] = useState<"day" | "week" | "agenda">(
    viewFromUrl() ?? initialContext.view ?? "day",
  );
  const [agendaBookings, setAgendaBookings] = useState<AdminBooking[]>([]);
  const [agendaCursor, setAgendaCursor] = useState<string | null>(null);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaError, setAgendaError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [manualBookingOpen, setManualBookingOpen] = useState(false);
  const [manualCustomer, setManualCustomer] = useState<{
    fullName: string;
    phone: string;
  } | null>(null);
  const reduceMotion = useReducedMotion();
  const boardState = useBookingBoard(date, onSessionExpired);
  const board = boardState.data;
  const weekState = useWeekBoard(
    date,
    filters.professionalId,
    view === "week",
    onSessionExpired,
  );
  const weekBoard = weekState.data;
  const realtimeReady = useRef(false);
  const pendingAlertIds = useRef(new Set<string>());
  const alertedBookingIds = useRef(new Set<string>());
  const escalatedBookingIds = useRef(new Set<string>());
  const [clockTick, setClockTick] = useState(0);
  useAdminRealtime((event) => {
    if (
      realtimeReady.current &&
      event.resourceType === "BOOKING" &&
      event.resourceId &&
      ["ONLINE_BOOKING_REQUESTED", "WAITLIST_OFFER_ACCEPTED"].includes(
        event.action,
      )
    ) {
      pendingAlertIds.current.add(event.resourceId);
    }
    void boardState.refresh(true);
  });

  useEffect(() => {
    const timer = window.setInterval(
      () => setClockTick((current) => current + 1),
      60_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!board) return;
    if (!realtimeReady.current) {
      board.pendingQueue.forEach((booking) =>
        alertedBookingIds.current.add(booking.id),
      );
      realtimeReady.current = true;
      return;
    }
    for (const booking of board.pendingQueue) {
      if (
        pendingAlertIds.current.has(booking.id) &&
        !alertedBookingIds.current.has(booking.id)
      ) {
        pendingAlertIds.current.delete(booking.id);
        alertedBookingIds.current.add(booking.id);
        const preferences = readAdminNotificationPreferences();
        setToast(
          `Yeni randevu talebi: ${new Intl.DateTimeFormat("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: board.branch.timezone,
          }).format(
            new Date(booking.startAt),
          )} · ${booking.items[0]?.serviceName ?? "Randevu"}`,
        );
        if (preferences.soundEnabled)
          void playAdminAlert().catch(() => undefined);
        if (
          preferences.desktopEnabled &&
          document.visibilityState !== "visible"
        ) {
          showDesktopBookingNotification({
            bookingId: booking.id,
            time: new Intl.DateTimeFormat("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: board.branch.timezone,
            }).format(new Date(booking.startAt)),
            service: booking.items[0]?.serviceName ?? "Randevu",
            customerName: booking.customerNameSnapshot,
          });
        }
      }
      const waitingMinutes = Math.floor(
        (Date.now() - new Date(booking.createdAt).getTime()) / 60_000,
      );
      if (
        waitingMinutes >= board.branch.pendingWarningMinutes &&
        !escalatedBookingIds.current.has(booking.id)
      ) {
        escalatedBookingIds.current.add(booking.id);
        setToast(
          `${booking.publicCode} · ${waitingMinutes} dakikadır karar bekliyor.`,
        );
      }
    }
    const activeIds = new Set(board.pendingQueue.map((booking) => booking.id));
    [...escalatedBookingIds.current].forEach((id) => {
      if (!activeIds.has(id)) escalatedBookingIds.current.delete(id);
    });
  }, [board, clockTick]);

  useEffect(() => {
    const baseTitle = "Randevu Merkezi";
    document.title = board?.summary.pendingTotal
      ? `(${board.summary.pendingTotal}) ${baseTitle}`
      : baseTitle;
    return () => {
      document.title = baseTitle;
    };
  }, [board?.summary.pendingTotal]);

  useEffect(() => {
    if (!initialCustomer) return;
    setManualCustomer(initialCustomer);
    setManualBookingOpen(true);
    onInitialCustomerConsumed?.();
  }, [initialCustomer, onInitialCustomerConsumed]);

  useEffect(() => {
    if (!board || !selected) return;
    const fresh = [...board.day.bookings, ...board.pendingQueue].find(
      (booking) => booking.id === selected.id,
    );
    if (fresh) setSelected(fresh);
  }, [board, selected]);

  useEffect(() => {
    if (!board || selected || !selectedIdToRestore) return;
    const restored = [...board.day.bookings, ...board.pendingQueue].find(
      (booking) => booking.id === selectedIdToRestore,
    );
    if (restored) setSelected(restored);
    setSelectedIdToRestore(null);
  }, [board, selected, selectedIdToRestore]);

  useEffect(() => {
    window.sessionStorage.setItem(
      ADMIN_CONTEXT_KEY,
      JSON.stringify({
        date,
        filters,
        selectedId: selected?.id ?? selectedIdToRestore,
        view,
      }),
    );
  }, [date, filters, selected?.id, selectedIdToRestore, view]);

  useEffect(() => {
    if (
      view === "week" &&
      weekBoard?.selectedProfessional.id &&
      !filters.professionalId
    ) {
      setFilters((current) => ({
        ...current,
        professionalId: weekBoard.selectedProfessional.id,
      }));
    }
  }, [filters.professionalId, view, weekBoard?.selectedProfessional.id]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    url.searchParams.set("date", date);
    if (filters.professionalId) {
      url.searchParams.set("professionalId", filters.professionalId);
    } else {
      url.searchParams.delete("professionalId");
    }
    window.history.replaceState(null, "", url);
  }, [date, filters.professionalId, view]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadAgenda = useCallback(
    async (cursor?: string, append = false) => {
      setAgendaLoading(true);
      setAgendaError("");
      try {
        const globalQuery = filters.query.trim();
        const response = await searchAdminBookings({
          ...(globalQuery ? {} : { from: date, to: shiftDate(date, 6) }),
          query: globalQuery || undefined,
          status: filters.status || undefined,
          professionalId: filters.professionalId || undefined,
          source: filters.source || undefined,
          cursor,
          limit: 20,
        });
        setAgendaBookings((current) =>
          append ? [...current, ...response.items] : response.items,
        );
        setAgendaCursor(response.nextCursor);
      } catch (reason) {
        setAgendaError(
          reason instanceof Error ? reason.message : "Agenda yüklenemedi.",
        );
      } finally {
        setAgendaLoading(false);
      }
    },
    [date, filters],
  );

  useEffect(() => {
    if (view !== "agenda") return;
    const timer = window.setTimeout(() => void loadAgenda(), 260);
    return () => window.clearTimeout(timer);
  }, [loadAgenda, view]);

  const matchesFilters = useCallback(
    (booking: AdminBooking, includeInactive = false) => {
      if (
        filters.professionalId &&
        booking.professional.id !== filters.professionalId
      )
        return false;
      if (filters.status && booking.status !== filters.status) return false;
      if (
        !filters.status &&
        !includeInactive &&
        ["REJECTED", "CANCELLED"].includes(booking.status)
      )
        return false;
      if (filters.source && booking.source !== filters.source) return false;
      const query = filters.query.trim().toLocaleLowerCase("tr-TR");
      return !query || bookingSearchText(booking).includes(query);
    },
    [filters],
  );

  const dayBookings = useMemo(
    () =>
      board?.day.bookings.filter((booking) => matchesFilters(booking)) ?? [],
    [board?.day.bookings, matchesFilters],
  );
  const pendingBookings = useMemo(
    () =>
      board?.pendingQueue.filter((booking) => matchesFilters(booking, true)) ??
      [],
    [board?.pendingQueue, matchesFilters],
  );
  const visibleProfessionals = useMemo(
    () =>
      board?.professionals.filter(
        (professional) =>
          !filters.professionalId || professional.id === filters.professionalId,
      ) ?? [],
    [board?.professionals, filters.professionalId],
  );

  const handleAction = async (
    kind: "approve" | "reject" | "cancel",
    booking: AdminBooking,
    reason?: string,
  ) => {
    const updated =
      kind === "cancel"
        ? await cancelAdminBooking(booking.id, reason ?? "")
        : await decideAdminBooking(
            booking.id,
            kind === "approve" ? "APPROVE" : "REJECT",
            reason,
          );
    setSelected(updated);
    setToast(
      kind === "approve"
        ? "Randevu onaylandı."
        : kind === "reject"
          ? "Talep reddedildi; saat yeniden açıldı."
          : "Randevu iptal edildi; saat yeniden açıldı.",
    );
    await boardState.refresh(true);
  };

  const handleWeekReschedule = async (
    booking: AdminBooking,
    targetDate: string,
    startTime: string,
  ) => {
    const payload = {
      expectedRevision: booking.revision,
      serviceIds: booking.items.map((item) => item.serviceId),
      professionalId:
        weekBoard?.selectedProfessional.id ?? booking.professional.id,
      date: targetDate,
      startTime,
    };
    try {
      const preview = await previewAdminBookingReschedule(booking.id, payload);
      let allowOverride = false;
      let overrideReason: string | undefined;
      if (preview.requiresOverride) {
        if (role === "PROFESSIONAL") {
          setToast(
            preview.reason ??
              "Bu hedef için salon yönetiminin onayı gerekiyor.",
          );
          return;
        }
        if (
          !window.confirm(
            `${preview.reason ?? "Bu hedef normal çalışma düzeninin dışında."}\n\nYönetici istisnası olarak devam edilsin mi?`,
          )
        ) {
          return;
        }
        const reason = window.prompt(
          "Bu istisnanın kısa gerekçesini yazın (en az 5 karakter):",
        );
        if (!reason || reason.trim().length < 5) {
          setToast("İstisna kaydedilmedi; kısa bir gerekçe zorunludur.");
          return;
        }
        allowOverride = true;
        overrideReason = reason.trim();
      }
      const updated = await rescheduleAdminBooking(booking.id, {
        ...payload,
        allowOverride,
        overrideReason,
      });
      setSelected(updated);
      setToast(
        allowOverride
          ? "Randevu yönetici istisnasıyla taşındı."
          : "Randevu yeni zamanına taşındı.",
      );
      await Promise.all([weekState.refresh(), boardState.refresh(true)]);
    } catch (reason) {
      if (reason instanceof AdminApiError && reason.status === 409) {
        setToast(
          "Bu randevu başka bir işlemde güncellendi. Takvim yenilendi; lütfen tekrar deneyin.",
        );
        await Promise.all([weekState.refresh(), boardState.refresh(true)]);
        return;
      }
      setToast(
        reason instanceof Error
          ? reason.message
          : "Randevu taşınamadı; eski konumu korundu.",
      );
    }
  };

  const openCustomerView = () => {
    window.sessionStorage.setItem(
      ADMIN_CONTEXT_KEY,
      JSON.stringify({ date, filters, selectedId: selected?.id ?? null }),
    );
    window.location.assign("/");
  };

  return (
    <div className="admin-shell">
      <AdminHeader
        refreshing={boardState.refreshing || weekState.loading}
        lastUpdatedAt={boardState.lastUpdatedAt}
        onRefresh={() =>
          void (view === "week" ? weekState.refresh() : boardState.refresh())
        }
        onLogout={onLogout}
        onOpenCustomer={openCustomerView}
        activeSection="bookings"
        onNavigate={onNavigate}
        role={role}
      />

      <main className="admin-main">
        {/*
          Görünen başlık üst şeritte duruyor, o yüzden burada tekrar edilmez;
          ancak sayfanın bir h1'i olmalı. Diğer yönetici ekranları bunu
          AdminPageFrame üzerinden alır, randevu panosu o çerçeveyi kullanmadığı
          için tek h1'siz ekran buydu.
        */}
        <h1 className="ri-sr-only">Randevular</h1>
        <AdminCommandBar
          date={date}
          professionals={board?.professionals ?? []}
          filters={filters}
          onDateChange={setDate}
          onFiltersChange={(next) => {
            if (next.query.trim() && next.query !== filters.query) {
              setView("agenda");
            }
            setFilters(next);
          }}
          view={view}
          onViewChange={setView}
          onCreateBooking={() => {
            setManualCustomer(null);
            setManualBookingOpen(true);
          }}
          canCreateBooking={role !== "PROFESSIONAL"}
        />

        {boardState.error && (
          <AdminErrorBanner
            title="Randevu panosu yenilenemedi"
            error={boardState.error}
            fallback="Randevu bilgilerini şu an yenileyemedik. Birkaç saniye sonra yeniden deneyebilirsin."
            onRetry={() => void boardState.refresh()}
            retryLabel="Panoyu yenile"
          />
        )}

        {board ? (
          <AdminSummary board={board} />
        ) : (
          <div className="admin-summary admin-summary--skeleton">
            <i />
            <i />
            <i />
          </div>
        )}

        {view === "day" && (
          <div
            className="admin-mobile-tabs"
            role="tablist"
            aria-label="Yönetici görünümü"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileView === "timeline"}
              onClick={() => setMobileView("timeline")}
            >
              Günlük akış
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileView === "pending"}
              onClick={() => setMobileView("pending")}
            >
              Bekleyenler <b>{board?.summary.pendingTotal ?? 0}</b>
            </button>
          </div>
        )}

        {view === "day" ? (
          <div
            className={`admin-workspace admin-workspace--${mobileView}${pendingBookings.length ? "" : " admin-workspace--queue-empty"}`}
          >
            {board ? (
              <PendingQueue
                bookings={pendingBookings}
                selectedId={selected?.id ?? null}
                timezone={board.branch.timezone}
                pendingWarningMinutes={board.branch.pendingWarningMinutes}
                onSelect={setSelected}
              />
            ) : (
              <aside className="pending-queue pending-queue--skeleton">
                <div className="admin-skeleton admin-skeleton--title" />
                <div className="admin-skeleton admin-skeleton--cards" />
              </aside>
            )}

            {board ? (
              <DayTimeline
                date={date}
                serverNow={board.serverNow}
                timezone={board.branch.timezone}
                openingMinute={board.branch.openingMinute}
                closingMinute={board.branch.closingMinute}
                professionals={visibleProfessionals}
                bookings={dayBookings}
                scheduleBlocks={board.day.scheduleBlocks}
                workingIntervals={board.branch.workingIntervals}
                isClosed={board.branch.isClosed}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
              />
            ) : (
              <TimelineSkeleton />
            )}
          </div>
        ) : view === "week" ? (
          weekState.error ? (
            <AdminErrorBanner
              title="Haftalık plan yenilenemedi"
              error={weekState.error}
              fallback="Haftalık plan şu anda yüklenemedi."
              onRetry={() => void weekState.refresh()}
              retryLabel="Haftayı yenile"
            />
          ) : weekBoard ? (
            <WeekTimeline
              board={weekBoard}
              anchorDate={date}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              onAnchorDateChange={setDate}
              onReschedule={handleWeekReschedule}
            />
          ) : (
            <TimelineSkeleton />
          )
        ) : (
          <AdminAgenda
            bookings={agendaBookings}
            loading={agendaLoading}
            error={agendaError}
            hasMore={Boolean(agendaCursor)}
            onLoadMore={() => {
              if (agendaCursor) void loadAgenda(agendaCursor, true);
            }}
            onSelect={(booking) => {
              setSelected(booking);
              const url = new URL(window.location.href);
              url.searchParams.set("booking", booking.id);
              window.history.replaceState(null, "", url);
            }}
          />
        )}

        {!board && !boardState.loading && !boardState.error && (
          <div className="admin-empty-state">
            <strong>Pano verisi bulunamadı</strong>
            <p>Sayfayı yenileyip tekrar deneyin.</p>
          </div>
        )}
      </main>

      {board && (
        <BookingDetailDrawer
          booking={selected}
          board={board}
          role={role}
          onClose={() => {
            setSelectedIdToRestore(null);
            setSelected(null);
            const url = new URL(window.location.href);
            url.searchParams.delete("booking");
            window.history.replaceState(null, "", url);
          }}
          onAction={handleAction}
          onOpenCustomer={openCustomerView}
          onUpdated={(booking, message) => {
            setSelected(booking);
            setToast(message);
            void boardState.refresh(true);
          }}
          onSeriesChanged={(message) => {
            setSelected(null);
            setToast(message);
            void boardState.refresh(true);
          }}
        />
      )}
      {board && role !== "PROFESSIONAL" && (
        <ManualBookingDrawer
          open={manualBookingOpen}
          board={board}
          initialDate={date}
          prefillCustomer={manualCustomer}
          onClose={() => {
            setManualBookingOpen(false);
            setManualCustomer(null);
          }}
          onCreated={(booking) => {
            const bookingDate = new Intl.DateTimeFormat("sv-SE", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              timeZone: board.branch.timezone,
            }).format(new Date(booking.startAt));
            setManualBookingOpen(false);
            setManualCustomer(null);
            setSelected(null);
            setSelectedIdToRestore(booking.id);
            setDate(bookingDate);
            setToast("Randevu salon akışına eklendi.");
            void boardState.refresh(true);
          }}
          onSeriesCreated={(count) => {
            setManualBookingOpen(false);
            setManualCustomer(null);
            setToast(`${count} randevuluk seri salon akışına eklendi.`);
            void boardState.refresh(true);
          }}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            className="admin-toast"
            role="status"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: motionDurations.card, ease: motionEase }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
