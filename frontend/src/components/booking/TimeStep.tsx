import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfToday,
} from "date-fns";
import { tr } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { ListPlusIcon } from "@phosphor-icons/react/dist/csr/ListPlus";
import { PhoneCallIcon } from "@phosphor-icons/react/dist/csr/PhoneCall";
import { useEffect, useMemo, useState } from "react";
import type { BookingFlow } from "../../hooks/useBookingFlow";
import { motionDurations, motionEase } from "../../design-system/motion";
import { InlineError, StepActions, StepHeader } from "./BookingPrimitives";

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").replace(/^90/, "");
  if (digits.length !== 10) return value;
  return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
};

export function TimeStep({ flow }: { flow: BookingFlow }) {
  const reduceMotion = useReducedMotion();
  const today = startOfToday();
  const todayKey = format(today, "yyyy-MM-dd");
  const bookingWindowDays = Number.isFinite(flow.bookingWindowDays)
    ? Math.max(1, Math.min(flow.bookingWindowDays, 90))
    : 30;
  const maximumDate = addDays(today, bookingWindowDays);
  const initialOffset = Math.max(
    0,
    Math.floor(
      differenceInCalendarDays(parseISO(flow.selectedDate), today) / 7,
    ),
  );
  const [weekOffset, setWeekOffset] = useState(initialOffset);
  useEffect(() => {
    setWeekOffset(
      Math.max(
        0,
        Math.floor(
          differenceInCalendarDays(
            parseISO(flow.selectedDate),
            parseISO(todayKey),
          ) / 7,
        ),
      ),
    );
  }, [flow.selectedDate, todayKey]);
  const visibleStart = addDays(today, weekOffset * 7);
  const dates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addDays(visibleStart, index),
      ).filter((date) => date <= maximumDate),
    [maximumDate, visibleStart],
  );
  const chronologicalSlots = [...(flow.availability?.slots ?? [])].sort(
    (a, b) => a.startTime.localeCompare(b.startTime),
  );
  const selectedDateLabel = format(parseISO(flow.selectedDate), "d MMMM EEEE", {
    locale: tr,
  });
  const phoneHref = `tel:${flow.salonPhone.replace(/[^\d+]/g, "")}`;
  const phoneLabel = formatPhone(flow.salonPhone);
  const waitlistQuery = new URLSearchParams({
    branch: flow.catalog.slug,
    services: flow.selectedServiceIds.join(","),
    date: flow.selectedDate,
  });
  if (flow.professionalId) {
    waitlistQuery.set("professional", flow.professionalId);
  }

  const selectCalendarDate = (value: string) => {
    const parsed = parseISO(value);
    setWeekOffset(
      Math.max(0, Math.floor(differenceInCalendarDays(parsed, today) / 7)),
    );
    flow.selectDate(value);
  };

  return (
    <div className="booking-step time-step">
      <StepHeader
        eyebrow="3 / 4"
        title="Tarih ve saat seç"
        meta={
          <span className="duration-badge">
            <ClockIcon size={16} weight="bold" /> {flow.totalDuration} dk
          </span>
        }
      />

      <div className="date-navigator">
        <button
          type="button"
          aria-label="Önceki hafta"
          disabled={weekOffset === 0}
          onClick={() => setWeekOffset((current) => Math.max(0, current - 1))}
        >
          <CaretLeftIcon size={19} weight="bold" />
        </button>
        <label className="date-calendar-control">
          <CalendarBlankIcon size={18} weight="duotone" />
          <span>
            <small>Seçili tarih</small>
            <strong>
              {format(parseISO(flow.selectedDate), "d MMM EEE", { locale: tr })}
            </strong>
          </span>
          <input
            type="date"
            min={format(today, "yyyy-MM-dd")}
            max={format(maximumDate, "yyyy-MM-dd")}
            value={flow.selectedDate}
            onChange={(event) => selectCalendarDate(event.target.value)}
          />
        </label>
        <button
          type="button"
          aria-label="Sonraki hafta"
          disabled={addDays(visibleStart, 7) > maximumDate}
          onClick={() => setWeekOffset((current) => current + 1)}
        >
          <CaretRightIcon size={19} weight="bold" />
        </button>
      </div>

      <div className="date-strip" aria-label="Randevu tarihi">
        {dates.map((date, index) => {
          const value = format(date, "yyyy-MM-dd");
          const selected = flow.selectedDate === value;
          const dayDistance = differenceInCalendarDays(date, today);
          return (
            <motion.button
              key={value}
              type="button"
              className={selected ? "is-selected" : ""}
              aria-pressed={selected}
              aria-label={`${format(date, "d MMMM EEEE", { locale: tr })}${dayDistance === 0 ? ", bugün" : dayDistance === 1 ? ", yarın" : ""}`}
              onClick={() => flow.selectDate(value)}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: motionDurations.micro,
                delay: reduceMotion ? 0 : index * 0.025,
                ease: motionEase,
              }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            >
              <small>
                {dayDistance === 0
                  ? "Bugün"
                  : dayDistance === 1
                    ? "Yarın"
                    : format(date, "EEE", { locale: tr })}
              </small>
              <strong>{format(date, "d")}</strong>
              <span>{format(date, "MMM", { locale: tr })}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="time-section-heading">
        <div>
          <span className="time-section-heading__icon">
            <ClockIcon size={19} weight="duotone" />
          </span>
          <span>
            <strong>Uygun saatler</strong>
            <small>{flow.selectedProfessional?.name ?? "Tüm uzmanlar"}</small>
          </span>
        </div>
      </div>

      {flow.busy ? (
        <div
          className="slot-skeletons"
          aria-label="Saatler yükleniyor"
          aria-busy="true"
        >
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      ) : flow.error && !flow.availability ? (
        <div className="slot-state slot-state--error">
          <ArrowsClockwiseIcon size={25} weight="bold" />
          <strong>Saatler şu an yenilenemedi.</strong>
          <span>{flow.error}</span>
          <button
            type="button"
            className="ri-button ri-button--secondary"
            onClick={flow.refreshAvailability}
          >
            Tekrar dene
          </button>
        </div>
      ) : chronologicalSlots.length ? (
        <div className="time-grid" aria-label="Uygun saatler">
          {chronologicalSlots.map((slot, index) => {
            const selected = flow.selectedSlot?.startTime === slot.startTime;
            return (
              <motion.button
                key={`${slot.startTime}-${slot.endTime}`}
                type="button"
                className={selected ? "is-selected" : ""}
                aria-pressed={selected}
                onClick={() => flow.selectSlot(slot)}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                transition={{
                  duration: motionDurations.micro,
                  delay: reduceMotion ? 0 : index * 0.018,
                  ease: motionEase,
                }}
              >
                <strong>{slot.startTime}</strong>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="slot-state slot-state--full">
          <span className="slot-state__icon">
            <CalendarBlankIcon size={27} weight="duotone" />
          </span>
          <strong>{selectedDateLabel} için online saatler doldu.</strong>
          <span>
            Programda kısa bir boşluk oluşabilir. Ekibimiz uygunluğu senin için
            kontrol edebilir.
          </span>
          <div className="slot-state__actions">
            <a
              className="ri-button ri-button--primary slot-call-button"
              href={phoneHref}
            >
              <PhoneCallIcon size={19} weight="bold" />
              <span>
                <strong>Salonu ara</strong>
                <small>{phoneLabel}</small>
              </span>
            </a>
            {flow.waitlistEnabled && (
              <a
                className="ri-button ri-button--secondary"
                href={`/bekleme-listesi?${waitlistQuery}`}
              >
                <ListPlusIcon size={18} weight="bold" />
                Bekleme listesine katıl
              </a>
            )}
          </div>
        </div>
      )}

      {!flow.busy && flow.availability && <InlineError message={flow.error} />}
      <StepActions
        onBack={() => flow.goToStep(2)}
        onNext={flow.beginConfirmation}
        disabled={!flow.selectedSlot}
        busy={flow.busy}
        nextLabel="Saati 5 dakika ayır"
      />
    </div>
  );
}
