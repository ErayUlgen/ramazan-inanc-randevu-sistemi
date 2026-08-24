import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { motionDurations, motionEase } from "../../design-system/motion";

export function StepHeader({
  eyebrow,
  title,
  description,
  meta,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  meta?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      className="step-header"
      initial={reduceMotion ? false : { opacity: 0, y: 9 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionDurations.card, ease: motionEase }}
    >
      <div className="step-header__eyebrow">{eyebrow}</div>
      <div className="step-header__row">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {meta && <div className="step-header__meta">{meta}</div>}
      </div>
    </motion.header>
  );
}

export function InlineError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="inline-error" role="alert" aria-live="polite">
      {message}
    </div>
  );
}

export function StepActions({
  onBack,
  onNext,
  disabled,
  busy,
  nextLabel = "Devam et",
}: {
  onBack?: () => void;
  onNext: () => void;
  disabled?: boolean;
  busy?: boolean;
  nextLabel?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="step-actions desktop-step-actions">
      {onBack ? (
        <motion.button
          type="button"
          className="ri-button ri-button--secondary"
          onClick={onBack}
          whileTap={reduceMotion ? undefined : { scale: 0.975 }}
        >
          <ArrowLeftIcon size={18} weight="bold" />
          Geri
        </motion.button>
      ) : (
        <span />
      )}
      <motion.button
        type="button"
        className="ri-button ri-button--primary"
        onClick={onNext}
        disabled={disabled || busy}
        whileTap={reduceMotion ? undefined : { scale: 0.975 }}
      >
        {busy ? "Hazırlanıyor…" : nextLabel}
        <ArrowRightIcon size={18} weight="bold" />
      </motion.button>
    </div>
  );
}
