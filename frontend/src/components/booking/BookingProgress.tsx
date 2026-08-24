import { motion, useReducedMotion } from "framer-motion";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import {
  motionDurations,
  motionEase,
  springSoft,
} from "../../design-system/motion";
import type { BookingStep } from "./booking.types";

const steps: Array<{ number: BookingStep; label: string }> = [
  { number: 1, label: "Hizmet" },
  { number: 2, label: "Uzman" },
  { number: 3, label: "Zaman" },
  { number: 4, label: "Onay" },
];

export function BookingProgress({
  step,
  onStep,
}: {
  step: BookingStep;
  onStep: (step: BookingStep) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.nav
      className="booking-progress"
      aria-label="Randevu adımları"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionDurations.card, ease: motionEase }}
    >
      <div className="booking-progress__line" aria-hidden="true">
        <motion.i
          initial={false}
          animate={{ width: `${((step - 1) / 3) * 100}%` }}
          transition={reduceMotion ? { duration: 0 } : springSoft}
        />
      </div>
      {steps.map((item, index) => {
        const completed = step > item.number;
        const active = step === item.number;
        return (
          <motion.button
            key={item.number}
            type="button"
            className={`progress-step ${active ? "is-active" : ""} ${completed ? "is-complete" : ""}`}
            onClick={() => completed && onStep(item.number)}
            disabled={!completed}
            aria-current={active ? "step" : undefined}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: motionDurations.card,
              delay: reduceMotion ? 0 : index * 0.045,
              ease: motionEase,
            }}
            whileTap={reduceMotion || !completed ? undefined : { scale: 0.96 }}
          >
            <span>
              {completed ? <CheckIcon size={17} weight="bold" /> : item.number}
            </span>
            <strong>{item.label}</strong>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}
