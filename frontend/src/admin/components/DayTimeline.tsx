import { motion, useReducedMotion } from "framer-motion";
import { ClockIcon as Clock3 } from "@phosphor-icons/react/dist/csr/Clock";
import type { CSSProperties } from "react";
import { ProfessionalAvatar } from "../../components/ui/ProfessionalAvatar";
import type {
  AdminBooking,
  AdminProfessional,
  AdminScheduleBlock,
  AdminTimeInterval,
} from "../admin.types";
import {
  bookingServiceLabel,
  formatTime,
  minutesInTimezone,
  STATUS_META,
  todayInIstanbul,
  VISIT_META,
} from "../lib/adminFormat";

const QUARTER_HEIGHT = 32;
const EDGE_INSET = QUARTER_HEIGHT / 2;
const TIMELINE_HEADER_HEIGHT = 80;

type Props = {
  date: string;
  serverNow: string;
  timezone: string;
  openingMinute: number;
  closingMinute: number;
  professionals: AdminProfessional[];
  bookings: AdminBooking[];
  scheduleBlocks: AdminScheduleBlock[];
  workingIntervals: AdminTimeInterval[];
  isClosed: boolean;
  selectedId: string | null;
  onSelect: (booking: AdminBooking) => void;
};

export function DayTimeline(props: Props) {
  const {
    date,
    serverNow,
    timezone,
    openingMinute,
    closingMinute,
    professionals,
    bookings,
    scheduleBlocks,
    workingIntervals,
    isClosed,
    selectedId,
    onSelect,
  } = props;
  const reduceMotion = useReducedMotion();
  const height =
    ((closingMinute - openingMinute) / 15) * QUARTER_HEIGHT + EDGE_INSET * 2;
  const timeLabels = Array.from(
    { length: Math.floor((closingMinute - openingMinute) / 60) + 1 },
    (_, index) => openingMinute + index * 60,
  );
  const currentMinute = minutesInTimezone(serverNow, timezone);
  const showNow =
    date === todayInIstanbul() &&
    currentMinute >= openingMinute &&
    currentMinute <= closingMinute;
  const nowTop = ((currentMinute - openingMinute) / 15) * QUARTER_HEIGHT;

  if (isClosed) {
    return (
      <section className="day-timeline admin-empty-state admin-closed-day">
        <span>
          <Clock3 size={26} />
        </span>
        <strong>Salon bu gün kapalı</strong>
        <p>Çalışma düzeninden özel gün saatlerini değiştirebilirsiniz.</p>
      </section>
    );
  }

  if (!professionals.length) {
    return (
      <section className="day-timeline admin-empty-state">
        <strong>Bu filtrede uzman bulunamadı</strong>
        <p>Uzman filtresini temizleyerek günlük akışı yeniden görüntüleyin.</p>
      </section>
    );
  }

  return (
    <section className="day-timeline" aria-labelledby="day-timeline-title">
      <header className="day-timeline__title">
        <span>
          <small>Canlı plan</small>
          <h2 id="day-timeline-title">Günlük akış</h2>
        </span>
        <em>
          <i /> 15 dakikalık ritim
        </em>
      </header>

      <div
        className="timeline-desktop"
        role="region"
        aria-label="Uzman bazlı günlük randevu zaman çizelgesi"
        tabIndex={0}
      >
        <div
          className="timeline-grid"
          style={
            {
              "--timeline-columns": professionals.length,
              "--timeline-min-width": `${64 + professionals.length * 148}px`,
            } as CSSProperties
          }
        >
          <div className="timeline-corner">
            <span className="timeline-clock-mark">
              <Clock3 size={21} />
            </span>
          </div>
          {professionals.map((professional) => (
            <div className="timeline-professional" key={professional.id}>
              <ProfessionalAvatar
                name={professional.name}
                src={professional.photoUrl ?? undefined}
                size="sm"
              />
              <span>
                <strong>{professional.name}</strong>
                <small>{professional.title}</small>
              </span>
            </div>
          ))}

          <div className="timeline-time-rail" style={{ height }}>
            {timeLabels.map((minute) => (
              <span
                key={minute}
                style={{
                  top:
                    EDGE_INSET +
                    ((minute - openingMinute) / 15) * QUARTER_HEIGHT,
                }}
              >
                {minuteLabel(minute)}
              </span>
            ))}
          </div>

          {professionals.map((professional) => (
            <div
              className="timeline-lane"
              style={{ height }}
              key={professional.id}
            >
              {workingGaps(workingIntervals, openingMinute, closingMinute).map(
                (gap) => (
                  <div
                    className="timeline-closed-gap"
                    key={`${gap.startMinute}-${gap.endMinute}`}
                    style={intervalPosition(
                      gap.startMinute,
                      gap.endMinute,
                      openingMinute,
                    )}
                    aria-label="Salon çalışma arası"
                  />
                ),
              )}
              {scheduleBlocks
                .filter(
                  (block) =>
                    block.professionalId === null ||
                    block.professionalId === professional.id,
                )
                .map((block) => (
                  <div
                    className={`timeline-block timeline-block--${block.kind.toLowerCase()}`}
                    key={`${professional.id}-${block.id}`}
                    style={timePosition(
                      block.startAt,
                      block.endAt,
                      timezone,
                      openingMinute,
                      closingMinute,
                    )}
                    aria-label={`${formatTime(block.startAt, timezone)} ${block.title}`}
                  >
                    <span>
                      <b>{formatTime(block.startAt, timezone)}</b>
                      <em>Blok</em>
                    </span>
                    <strong>{block.title}</strong>
                  </div>
                ))}
              {bookings
                .filter(
                  (booking) => booking.professional.id === professional.id,
                )
                .map((booking, index) => {
                  const style = bookingPosition(
                    booking,
                    timezone,
                    openingMinute,
                    closingMinute,
                  );
                  return (
                    <motion.button
                      type="button"
                      className={`timeline-booking timeline-booking--${booking.visitStatus === "NO_SHOW" ? VISIT_META.NO_SHOW.tone : STATUS_META[booking.status].tone}${selectedId === booking.id ? " is-selected" : ""}`}
                      style={style}
                      key={booking.id}
                      onClick={() => onSelect(booking)}
                      initial={
                        reduceMotion ? false : { opacity: 0, scale: 0.97, y: 4 }
                      }
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      whileTap={
                        reduceMotion ? undefined : { scale: 0.985 }
                      }
                      transition={{
                        delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.12),
                      }}
                      aria-label={`${formatTime(booking.startAt, timezone)} ${booking.customerNameSnapshot ?? booking.customer?.fullName ?? "Saat tutuluyor"}, ${booking.visitStatus === "NO_SHOW" ? VISIT_META.NO_SHOW.label : STATUS_META[booking.status].label}`}
                    >
                      <span>
                        <b>{formatTime(booking.startAt, timezone)}</b>
                        <em>
                          {booking.visitStatus === "NO_SHOW"
                            ? VISIT_META.NO_SHOW.shortLabel
                            : STATUS_META[booking.status].shortLabel}
                        </em>
                      </span>
                      <strong>
                        {booking.customerNameSnapshot ??
                          booking.customer?.fullName ??
                          "Saat tutuluyor"}
                      </strong>
                      {booking.totalDurationMinutes >= 30 && (
                        <small>{bookingServiceLabel(booking)}</small>
                      )}
                      {booking.formStatus &&
                        booking.formStatus !== "NOT_REQUIRED" &&
                        booking.totalDurationMinutes >= 45 && (
                          <i
                            className={`timeline-form-status is-${booking.formStatus.toLowerCase()}`}
                          >
                            {booking.formStatus === "PENDING"
                              ? "Form bekliyor"
                              : booking.formStatus === "REVIEWED"
                                ? "Form incelendi"
                                : "Form tamam"}
                          </i>
                        )}
                    </motion.button>
                  );
                })}
            </div>
          ))}
          {showNow && (
            <div
              className="timeline-now"
              style={{ top: TIMELINE_HEADER_HEIGHT + EDGE_INSET + nowTop }}
              aria-label="Şu an"
            >
              <span>{formatTime(serverNow, timezone)}</span>
              <i />
            </div>
          )}
        </div>
      </div>

      <div className="timeline-agenda">
        {!bookings.length && !scheduleBlocks.length && (
          <div className="admin-empty-state">
            <span>
              <Clock3 size={24} />
            </span>
            <strong>Bu gün için kayıt yok</strong>
            <p>Filtreleri temizleyebilir veya başka bir güne geçebilirsiniz.</p>
          </div>
        )}
        {professionals.map((professional) => {
          const professionalBookings = bookings
            .filter((booking) => booking.professional.id === professional.id)
            .sort((a, b) => a.startAt.localeCompare(b.startAt));
          const professionalBlocks = scheduleBlocks.filter(
            (block) =>
              block.professionalId === null ||
              block.professionalId === professional.id,
          );
          if (!professionalBookings.length && !professionalBlocks.length)
            return null;
          return (
            <section className="agenda-group" key={professional.id}>
              <header>
                <ProfessionalAvatar
                  name={professional.name}
                  src={professional.photoUrl ?? undefined}
                  size="sm"
                />
                <strong>{professional.name}</strong>
                <b>{professionalBookings.length + professionalBlocks.length}</b>
              </header>
              <div>
                {professionalBlocks.map((block) => (
                  <div
                    className="agenda-block"
                    key={`${professional.id}-${block.id}`}
                  >
                    <span className="agenda-time">
                      <strong>{formatTime(block.startAt, timezone)}</strong>
                      <small>{formatTime(block.endAt, timezone)}</small>
                    </span>
                    <span className="agenda-copy">
                      <strong>{block.title}</strong>
                      <small>{BLOCK_LABELS[block.kind]}</small>
                    </span>
                    <em>Blok</em>
                  </div>
                ))}
                {professionalBookings.map((booking) => (
                  <button
                    type="button"
                    key={booking.id}
                    onClick={() => onSelect(booking)}
                    className={selectedId === booking.id ? "is-selected" : ""}
                  >
                    <span className="agenda-time">
                      <strong>{formatTime(booking.startAt, timezone)}</strong>
                      <small>{formatTime(booking.endAt, timezone)}</small>
                    </span>
                    <span className="agenda-copy">
                      <strong>
                        {booking.customerNameSnapshot ??
                          booking.customer?.fullName ??
                          "Saat tutuluyor"}
                      </strong>
                      <small>
                        {bookingServiceLabel(booking)}
                      </small>
                    </span>
                    <em
                      className={`admin-status-chip admin-status-chip--${STATUS_META[booking.status].tone}`}
                    >
                      {booking.visitStatus === "NO_SHOW"
                        ? VISIT_META.NO_SHOW.shortLabel
                        : STATUS_META[booking.status].shortLabel}
                    </em>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export function TimelineSkeleton() {
  return (
    <section
      className="day-timeline day-timeline--skeleton"
      aria-label="Günlük akış yükleniyor"
    >
      <div className="admin-skeleton admin-skeleton--title" />
      <div className="admin-skeleton admin-skeleton--timeline" />
    </section>
  );
}

function bookingPosition(
  booking: AdminBooking,
  timezone: string,
  openingMinute: number,
  closingMinute: number,
): CSSProperties {
  const start = Math.max(
    minutesInTimezone(booking.startAt, timezone),
    openingMinute,
  );
  const end = Math.min(
    minutesInTimezone(booking.endAt, timezone),
    closingMinute,
  );
  return {
    top: EDGE_INSET + ((start - openingMinute) / 15) * QUARTER_HEIGHT,
    height: Math.max(((end - start) / 15) * QUARTER_HEIGHT, 26),
  };
}

function timePosition(
  startAt: string,
  endAt: string,
  timezone: string,
  openingMinute: number,
  closingMinute: number,
): CSSProperties {
  const start = Math.max(minutesInTimezone(startAt, timezone), openingMinute);
  const end = Math.min(minutesInTimezone(endAt, timezone), closingMinute);
  return intervalPosition(start, end, openingMinute);
}

function intervalPosition(
  startMinute: number,
  endMinute: number,
  openingMinute: number,
): CSSProperties {
  return {
    top: EDGE_INSET + ((startMinute - openingMinute) / 15) * QUARTER_HEIGHT + 3,
    height: Math.max(((endMinute - startMinute) / 15) * QUARTER_HEIGHT - 6, 26),
  };
}

function workingGaps(
  intervals: AdminTimeInterval[],
  openingMinute: number,
  closingMinute: number,
) {
  const gaps: AdminTimeInterval[] = [];
  let cursor = openingMinute;
  for (const interval of intervals) {
    if (interval.startMinute > cursor) {
      gaps.push({ startMinute: cursor, endMinute: interval.startMinute });
    }
    cursor = Math.max(cursor, interval.endMinute);
  }
  if (cursor < closingMinute)
    gaps.push({ startMinute: cursor, endMinute: closingMinute });
  return gaps;
}

const BLOCK_LABELS: Record<AdminScheduleBlock["kind"], string> = {
  BREAK: "Mola",
  UNAVAILABLE: "Müsait değil",
  TRAINING: "Eğitim",
  PERSONAL: "Kişisel",
  BRANCH_BLOCK: "Salon bloğu",
  OTHER: "Diğer",
};

function minuteLabel(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}
