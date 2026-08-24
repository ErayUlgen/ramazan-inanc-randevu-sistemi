import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { UserCircleIcon } from "@phosphor-icons/react/dist/csr/UserCircle";
import { motionDurations, motionEase } from "../../design-system/motion";
import type { BookingFlow } from "../../hooks/useBookingFlow";

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

const shortDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });

export function BookingSummary({ flow }: { flow: BookingFlow }) {
  const reduceMotion = useReducedMotion();
  const unresolvedVariation =
    !flow.selectedProfessional &&
    !flow.hold &&
    flow.selectedServices.some((service) => service.variesByProfessional);

  return (
    <motion.aside
      className="booking-summary"
      aria-label="Canlı randevu özeti"
      initial={reduceMotion ? false : { opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: motionDurations.card,
        delay: reduceMotion ? 0 : 0.12,
        ease: motionEase,
      }}
    >
      <div className="booking-summary__topline">
        <span>Özet</span>
      </div>

      <div className="booking-summary__headline">
        <span>{unresolvedVariation ? "Başlangıç" : "Toplam"}</span>
        <motion.strong
          key={flow.totalPrice}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {currency.format(flow.totalPrice / 100)}
        </motion.strong>
        <small>{flow.totalDuration} dk</small>
      </div>

      <div className="booking-summary__section">
        <div className="summary-section-title">
          <span>Hizmet</span>
          <strong>
            {flow.selectedServices.length ? "Seçildi" : "Bekleniyor"}
          </strong>
        </div>
        <AnimatePresence initial={false}>
          {flow.selectedServices.map((service) => (
            <motion.div
              key={service.id}
              className="summary-service"
              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span>
                <CheckIcon size={15} weight="bold" />
              </span>
              <div>
                <strong>{service.name}</strong>
                <small>
                  {flow.totalDuration} dk
                  {unresolvedVariation ? "’dan başlayan" : ""}
                </small>
              </div>
              <b>
                {currency.format(flow.totalPrice / 100)}
                {unresolvedVariation ? " +" : ""}
              </b>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <dl className="booking-summary__facts">
        <div>
          <dt>
            <UserCircleIcon size={18} weight="duotone" /> Uzman
          </dt>
          <dd>{flow.selectedProfessional?.name ?? "İlk müsait uzman"}</dd>
        </div>
        <div>
          <dt>
            <CalendarBlankIcon size={18} weight="duotone" /> Tarih
          </dt>
          <dd>{shortDate(flow.selectedDate)}</dd>
        </div>
        <div>
          <dt>
            <ClockIcon size={18} weight="duotone" /> Saat
          </dt>
          <dd>{flow.selectedSlot?.startTime ?? "Seçilmedi"}</dd>
        </div>
      </dl>
    </motion.aside>
  );
}
