import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/csr/CalendarCheck";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { MapPinIcon } from "@phosphor-icons/react/dist/csr/MapPin";
import { PhoneCallIcon } from "@phosphor-icons/react/dist/csr/PhoneCall";
import { useEffect, useRef } from "react";
import { useBookingFlow } from "../../hooks/useBookingFlow";
import {
  itemVariants,
  motionDurations,
  motionEase,
} from "../../design-system/motion";
import { StudioVideoPanel } from "../brand/StudioVideoPanel";
import { BookingProgress } from "./BookingProgress";
import { BookingSummary } from "./BookingSummary";
import { BrandHeader } from "./BrandHeader";
import { ConfirmationStep } from "./ConfirmationStep";
import { MobileBookingBar } from "./MobileBookingBar";
import { PendingApprovalView } from "./PendingApprovalView";
import { ProfessionalStep } from "./ProfessionalStep";
import { ServiceStep } from "./ServiceStep";
import { TimeStep } from "./TimeStep";

export function BookingExperience() {
  const flow = useBookingFlow();
  const reduceMotion = useReducedMotion();
  const previousStep = useRef(flow.step);
  const bookingStartRef = useRef<HTMLElement>(null);
  const direction = flow.step >= previousStep.current ? 1 : -1;

  useEffect(() => {
    if (previousStep.current === flow.step) return;
    previousStep.current = flow.step;
    const frame = window.requestAnimationFrame(() => {
      bookingStartRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [flow.step, reduceMotion]);

  useEffect(() => {
    if (flow.successCode) {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }, [flow.successCode, reduceMotion]);

  if (flow.successCode) return <PendingApprovalView flow={flow} />;

  const mobileAction =
    flow.step === 1
      ? {
          label: "Uzman seçimine geç",
          disabled: !flow.selectedServiceIds.length,
          action: flow.continueFromServices,
        }
      : flow.step === 2
        ? {
            label: "Saatleri gör",
            disabled: false,
            action: flow.continueFromProfessional,
          }
        : {
            label: "Saati 5 dakika ayır",
            disabled: !flow.selectedSlot,
            action: flow.beginConfirmation,
          };

  return (
    <div className="app-shell">
      <section className="cinematic-stage" aria-labelledby="booking-title">
        <StudioVideoPanel />
        <div className="cinematic-stage__content">
          <BrandHeader dataMode={flow.dataMode} mapsUrl={flow.mapsUrl} />
          <section className="intro-band">
            <motion.div
              className="intro-copy"
              initial={reduceMotion ? false : "hidden"}
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: reduceMotion ? 0 : 0.055,
                    delayChildren: 0.04,
                  },
                },
              }}
            >
              <motion.div
                className="intro-meta"
                aria-label="Stüdyo bilgileri"
                variants={itemVariants}
              >
                <span>Denizli</span>
                <i />
                <span>10.00—21.00</span>
              </motion.div>
              <motion.h1 id="booking-title" variants={itemVariants}>
                Hizmetini seç.
                <br className="intro-break" /> <em>Zamanını ayıralım.</em>
              </motion.h1>
              <motion.p variants={itemVariants}>
                Hizmetini ve saatini seç; talebini gönder.
              </motion.p>
              <motion.div className="intro-proof" variants={itemVariants}>
                <motion.span whileHover={reduceMotion ? undefined : { x: 2 }}>
                  <CalendarCheckIcon size={20} weight="duotone" />
                  <b>Gerçek uygunluk</b>
                </motion.span>
                <motion.span whileHover={reduceMotion ? undefined : { x: 2 }}>
                  <ShieldCheckIcon size={20} weight="duotone" />
                  <b>Güvenli talep</b>
                </motion.span>
              </motion.div>
            </motion.div>
          </section>
        </div>
      </section>

      {flow.dataMode === "unavailable" ? (
        <main
          id="booking"
          ref={bookingStartRef}
          className="booking-main booking-workbench"
        >
          <section className="booking-service-unavailable" role="alert">
            <span className="booking-service-unavailable__icon">
              <ArrowsClockwiseIcon size={28} weight="duotone" />
            </span>
            <div>
              <small>Online randevu</small>
              <h2>Şu anda kısa bir ara verdik.</h2>
              <p>Uygunluğu salon ekibimizle hemen kontrol edebilirsin.</p>
            </div>
            <div className="booking-service-unavailable__actions">
              <a
                className="ri-button ri-button--primary"
                href={`tel:${flow.salonPhone.replace(/[^\d+]/g, "")}`}
              >
                <PhoneCallIcon size={19} weight="bold" />
                Salonu ara
              </a>
              <a
                className="ri-button ri-button--secondary"
                href={flow.mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                <MapPinIcon size={19} weight="bold" />
                Yol tarifi
              </a>
              <button
                className="ri-button ri-button--secondary"
                type="button"
                onClick={flow.retryConnection}
              >
                <ArrowsClockwiseIcon size={19} weight="bold" />
                Tekrar dene
              </button>
            </div>
          </section>
        </main>
      ) : (
        <main
          id="booking"
          ref={bookingStartRef}
          className="booking-main booking-workbench"
        >
          {flow.rebookMessage && (
            <section className="rebook-banner" role="status">
              <CalendarCheckIcon size={23} weight="duotone" />
              <span>
                <small>Yeniden randevu</small>
                <strong>{flow.rebookMessage}</strong>
                {flow.rebookSuggestion?.service && (
                  <p>
                    {flow.rebookSuggestion.service.name}
                    {flow.rebookSuggestion.professional
                      ? ` · ${flow.rebookSuggestion.professional.name}`
                      : " · İlk müsait uzman"}
                  </p>
                )}
              </span>
              {flow.rebookSuggestion?.service && (
                <button type="button" onClick={flow.changeRebookSelection}>
                  Seçimi değiştir
                </button>
              )}
            </section>
          )}
          <BookingProgress step={flow.step} onStep={flow.goToStep} />

          <motion.div
            className="booking-layout"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: motionDurations.card,
              delay: reduceMotion ? 0 : 0.08,
              ease: motionEase,
            }}
          >
            <section className="booking-panel" aria-label="Randevu seçim alanı">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={flow.step}
                  custom={direction}
                  initial={
                    reduceMotion ? false : { opacity: 0, x: direction * 18 }
                  }
                  animate={{ opacity: 1, x: 0 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: direction * -12 }
                  }
                  transition={{
                    duration: motionDurations.page,
                    ease: motionEase,
                  }}
                >
                  {flow.step === 1 && <ServiceStep flow={flow} />}
                  {flow.step === 2 && <ProfessionalStep flow={flow} />}
                  {flow.step === 3 && <TimeStep flow={flow} />}
                  {flow.step === 4 && <ConfirmationStep flow={flow} />}
                </motion.div>
              </AnimatePresence>
            </section>
            <BookingSummary flow={flow} />
          </motion.div>
        </main>
      )}

      {flow.dataMode !== "unavailable" && (
        <MobileBookingBar
          flow={flow}
          onContinue={mobileAction.action}
          disabled={mobileAction.disabled}
          label={mobileAction.label}
        />
      )}
      <motion.footer
        className="site-footer"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: motionDurations.card,
          delay: reduceMotion ? 0 : 0.16,
          ease: motionEase,
        }}
      >
        <span>© {new Date().getFullYear()} Ramazan İnanç Hair Art Studio</span>
        <span>Denizli</span>
      </motion.footer>
    </div>
  );
}
