import { useMemo, useRef, useState, type CSSProperties } from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import type {
  AdminBooking,
  AdminScheduleBlock,
  AdminWeekBoard,
} from "../admin.types";
import {
  bookingServiceLabel,
  formatTime,
  minutesInTimezone,
  STATUS_META,
  VISIT_META,
} from "../lib/adminFormat";

const QUARTER_HEIGHT = 28;
const EDGE_INSET = 14;

type DropTarget = {
  date: string;
  minute: number;
  valid: boolean;
  bookingId: string;
};

type Props = {
  board: AdminWeekBoard;
  anchorDate: string;
  selectedId: string | null;
  onSelect: (booking: AdminBooking) => void;
  onAnchorDateChange: (date: string) => void;
  onReschedule: (
    booking: AdminBooking,
    date: string,
    startTime: string,
  ) => Promise<void>;
};

export function WeekTimeline({
  board,
  anchorDate,
  selectedId,
  onSelect,
  onAnchorDateChange,
  onReschedule,
}: Props) {
  const [dragged, setDragged] = useState<AdminBooking | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const lanes = useRef(new Map<string, HTMLDivElement>());
  const height =
    ((board.branch.closingMinute - board.branch.openingMinute) / 15) *
      QUARTER_HEIGHT +
    EDGE_INSET * 2;
  const labels = Array.from(
    {
      length:
        Math.floor(
          (board.branch.closingMinute - board.branch.openingMinute) / 60,
        ) + 1,
    },
    (_, index) => board.branch.openingMinute + index * 60,
  );
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: board.branch.timezone,
  }).format(new Date());
  const activeMobileDate = board.days.some((day) => day.date === anchorDate)
    ? anchorDate
    : board.weekStart;

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, AdminBooking[]>();
    for (const booking of board.bookings) {
      const date = dateInTimezone(booking.startAt, board.branch.timezone);
      map.set(date, [...(map.get(date) ?? []), booking]);
    }
    return map;
  }, [board.bookings, board.branch.timezone]);

  const blocksByDate = useMemo(() => {
    const map = new Map<string, AdminScheduleBlock[]>();
    for (const block of board.scheduleBlocks) {
      const date = dateInTimezone(block.startAt, board.branch.timezone);
      map.set(date, [...(map.get(date) ?? []), block]);
    }
    return map;
  }, [board.branch.timezone, board.scheduleBlocks]);

  const updateTarget = (
    date: string,
    clientY: number,
    booking: AdminBooking,
  ) => {
    const lane = lanes.current.get(date);
    const day = board.days.find((item) => item.date === date);
    if (!lane || !day) return;
    const rect = lane.getBoundingClientRect();
    const raw =
      board.branch.openingMinute +
      ((clientY - rect.top - EDGE_INSET) / QUARTER_HEIGHT) * 15;
    const minute = Math.max(
      board.branch.openingMinute,
      Math.min(
        board.branch.closingMinute - booking.totalDurationMinutes,
        Math.round(raw / 15) * 15,
      ),
    );
    const end = minute + booking.totalDurationMinutes;
    const inWorkingTime = day.workingIntervals.some(
      (interval) =>
        minute >= interval.startMinute && end <= interval.endMinute,
    );
    setTarget({
      date,
      minute,
      valid: !day.isClosed && inWorkingTime,
      bookingId: booking.id,
    });
  };

  return (
    <section className="week-timeline" aria-labelledby="week-timeline-title">
      <header className="week-timeline__title">
        <span>
          <small>Haftalık plan</small>
          <h2 id="week-timeline-title">{board.selectedProfessional.name}</h2>
        </span>
        <p>
          {formatShortDate(board.weekStart)}–{formatShortDate(board.weekEnd)}
        </p>
      </header>

      <div className="week-mobile-days" role="tablist" aria-label="Hafta günleri">
        {board.days.map((day) => (
          <button
            key={day.date}
            type="button"
            role="tab"
            aria-selected={day.date === activeMobileDate}
            className={day.date === activeMobileDate ? "is-active" : ""}
            onClick={() => onAnchorDateChange(day.date)}
          >
            <small>{weekday(day.date)}</small>
            <strong>{Number(day.date.slice(-2))}</strong>
          </button>
        ))}
      </div>

      {dragged && target && (
        <div
          className={`week-drag-status ${target.valid ? "is-valid" : "is-invalid"}`}
          role="status"
        >
          {target.valid ? (
            <CalendarBlankIcon size={18} weight="bold" />
          ) : (
            <WarningCircleIcon size={18} weight="bold" />
          )}
          <strong>
            {longDate(target.date)} · {minuteLabel(target.minute)}–
            {minuteLabel(target.minute + dragged.totalDurationMinutes)}
          </strong>
          <span>
            {target.valid
              ? "Bıraktığınızda sunucu uygunluğu yeniden doğrular."
              : "Bu hedef çalışma aralığının dışında."}
          </span>
        </div>
      )}

      <div
        className="week-timeline__viewport"
        role="region"
        aria-label="Yedi günlük uzman takvimi"
        tabIndex={0}
      >
        <div className="week-grid">
          <div className="week-grid__corner" />
          {board.days.map((day) => (
            <header
              key={day.date}
              className={`week-day-heading${day.date === today ? " is-today" : ""}${day.date === activeMobileDate ? " is-mobile-selected" : ""}`}
            >
              <small>{weekday(day.date)}</small>
              <strong>{longDate(day.date)}</strong>
              {day.isClosed && <em>Kapalı</em>}
            </header>
          ))}
          <div className="week-time-rail" style={{ height }}>
            {labels.map((minute) => (
              <span
                key={minute}
                style={{
                  top:
                    EDGE_INSET +
                    ((minute - board.branch.openingMinute) / 15) *
                      QUARTER_HEIGHT,
                }}
              >
                {minuteLabel(minute)}
              </span>
            ))}
          </div>
          {board.days.map((day) => (
            <div
              key={day.date}
              ref={(element) => {
                if (element) lanes.current.set(day.date, element);
              }}
              className={`week-lane${day.isClosed ? " is-closed" : ""}${day.date === activeMobileDate ? " is-mobile-selected" : ""}`}
              style={{ height }}
              onDragOver={(event) => {
                if (!dragged) return;
                event.preventDefault();
                updateTarget(day.date, event.clientY, dragged);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!dragged || !target?.valid) return;
                const booking = dragged;
                const drop = target;
                setDragged(null);
                setTarget(null);
                void onReschedule(
                  booking,
                  drop.date,
                  minuteLabel(drop.minute),
                );
              }}
            >
              {workingGaps(
                day.workingIntervals,
                board.branch.openingMinute,
                board.branch.closingMinute,
              ).map((gap) => (
                <i
                  className="week-closed-gap"
                  key={`${gap.startMinute}-${gap.endMinute}`}
                  style={minutePosition(
                    gap.startMinute,
                    gap.endMinute,
                    board.branch.openingMinute,
                  )}
                />
              ))}
              {(blocksByDate.get(day.date) ?? []).map((block) => (
                <div
                  className="week-block"
                  key={block.id}
                  style={dateTimePosition(
                    block.startAt,
                    block.endAt,
                    board.branch.timezone,
                    board.branch.openingMinute,
                    board.branch.closingMinute,
                  )}
                >
                  <strong>{block.title}</strong>
                  <small>{formatTime(block.startAt, board.branch.timezone)}</small>
                </div>
              ))}
              {(bookingsByDate.get(day.date) ?? []).map((booking) => {
                const draggable = canMove(booking);
                return (
                  <button
                    type="button"
                    key={booking.id}
                    draggable={draggable}
                    onDragStart={(event) => {
                      if (!draggable) {
                        event.preventDefault();
                        return;
                      }
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", booking.id);
                      setDragged(booking);
                    }}
                    onDragEnd={() => {
                      setDragged(null);
                      setTarget(null);
                    }}
                    onClick={() => onSelect(booking)}
                    className={`week-booking week-booking--${
                      booking.visitStatus === "NO_SHOW"
                        ? VISIT_META.NO_SHOW.tone
                        : STATUS_META[booking.status].tone
                    }${selectedId === booking.id ? " is-selected" : ""}`}
                    style={dateTimePosition(
                      booking.startAt,
                      booking.endAt,
                      board.branch.timezone,
                      board.branch.openingMinute,
                      board.branch.closingMinute,
                    )}
                    aria-label={`${formatTime(booking.startAt, board.branch.timezone)} ${booking.customerNameSnapshot ?? "Randevu"}, ${draggable ? "sürüklenebilir" : "taşınamaz"}`}
                  >
                    <span>
                      <b>{formatTime(booking.startAt, board.branch.timezone)}</b>
                      <em>{STATUS_META[booking.status].shortLabel}</em>
                    </span>
                    <strong>
                      {booking.customerNameSnapshot ??
                        booking.customer?.fullName ??
                        "Saat tutuluyor"}
                    </strong>
                    <small>{bookingServiceLabel(booking)}</small>
                    {booking.formStatus &&
                      booking.formStatus !== "NOT_REQUIRED" && (
                        <i>
                          {booking.formStatus === "PENDING"
                            ? "Form bekliyor"
                            : booking.formStatus === "REVIEWED"
                              ? "Form incelendi"
                              : "Form tamam"}
                        </i>
                      )}
                    {booking.scheduleOverride && <i>Yönetici istisnası</i>}
                  </button>
                );
              })}
              {target?.date === day.date && dragged && (
                <div
                  className={`week-drop-preview ${target.valid ? "is-valid" : "is-invalid"}`}
                  style={minutePosition(
                    target.minute,
                    target.minute + dragged.totalDurationMinutes,
                    board.branch.openingMinute,
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="week-keyboard-note">
        Klavye veya mobil kullanımda randevuyu açıp “Tarih veya saati değiştir”
        seçeneğini kullanabilirsiniz.
      </p>
    </section>
  );
}

function canMove(booking: AdminBooking) {
  return (
    new Date(booking.startAt) > new Date() &&
    !["CANCELLED", "REJECTED", "EXPIRED"].includes(booking.status) &&
    booking.visitStatus !== "NO_SHOW"
  );
}

function dateTimePosition(
  startAt: string,
  endAt: string,
  timezone: string,
  openingMinute: number,
  closingMinute: number,
): CSSProperties {
  const start = Math.max(minutesInTimezone(startAt, timezone), openingMinute);
  const end = Math.min(minutesInTimezone(endAt, timezone), closingMinute);
  return minutePosition(start, end, openingMinute);
}

function minutePosition(
  start: number,
  end: number,
  openingMinute: number,
): CSSProperties {
  return {
    top: EDGE_INSET + ((start - openingMinute) / 15) * QUARTER_HEIGHT,
    height: Math.max(((end - start) / 15) * QUARTER_HEIGHT, 25),
  };
}

function workingGaps(
  intervals: Array<{ startMinute: number; endMinute: number }>,
  openingMinute: number,
  closingMinute: number,
) {
  const gaps: Array<{ startMinute: number; endMinute: number }> = [];
  let cursor = openingMinute;
  for (const interval of intervals) {
    if (interval.startMinute > cursor) {
      gaps.push({ startMinute: cursor, endMinute: interval.startMinute });
    }
    cursor = Math.max(cursor, interval.endMinute);
  }
  if (cursor < closingMinute) {
    gaps.push({ startMinute: cursor, endMinute: closingMinute });
  }
  return gaps;
}

function dateInTimezone(value: string, timezone: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function weekday(date: string) {
  return new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(
    new Date(`${date}T12:00:00+03:00`),
  );
}

function longDate(date: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00+03:00`));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00+03:00`));
}

function minuteLabel(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(
    minute % 60,
  ).padStart(2, "0")}`;
}
