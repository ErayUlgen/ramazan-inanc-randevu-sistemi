import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { motionDurations, motionEase } from "../../design-system/motion";
import type { BookingFlow } from "../../hooks/useBookingFlow";

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

export function MobileBookingBar({
  flow,
  onContinue,
  disabled,
  label,
}: {
  flow: BookingFlow;
  onContinue: () => void;
  disabled?: boolean;
  label: string;
}) {
  const reduceMotion = useReducedMotion();
  const unresolvedVariation =
    !flow.selectedProfessional &&
    !flow.hold &&
    flow.selectedServices.some((service) => service.variesByProfessional);
  if (flow.step === 4) return null;

  return (
    <motion.div
      className="mobile-booking-bar"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionDurations.card, ease: motionEase }}
    >
      <details>
        <summary>
          <span>
            <strong>
              {unresolvedVariation ? "Başlangıç " : ""}
              {currency.format(flow.totalPrice / 100)}
            </strong>
            <small>
              {flow.selectedServices.length
                ? `1 hizmet · ${flow.totalDuration} dk${unresolvedVariation ? " +" : ""}`
                : "Hizmet seçilmedi"}
            </small>
          </span>
          <CaretDownIcon size={20} weight="bold" />
        </summary>
        <div className="mobile-booking-bar__details">
          {flow.selectedServices.map((service) => (
            <div key={service.id}>
              <span>{service.name}</span>
              <strong>
                {unresolvedVariation
                  ? "Uzmana göre"
                  : currency.format(flow.totalPrice / 100)}
              </strong>
            </div>
          ))}
        </div>
      </details>
      <motion.button
        type="button"
        className="ri-button ri-button--primary"
        onClick={onContinue}
        disabled={disabled || flow.busy}
        whileTap={
          reduceMotion || disabled || flow.busy ? undefined : { scale: 0.98 }
        }
      >
        {flow.busy ? "Hazırlanıyor…" : label}
        <ArrowRightIcon size={18} weight="bold" />
      </motion.button>
    </motion.div>
  );
}
