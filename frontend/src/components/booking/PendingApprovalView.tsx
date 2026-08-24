import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { UserCircleIcon } from "@phosphor-icons/react/dist/csr/UserCircle";
import type { BookingFlow } from "../../hooks/useBookingFlow";
import { motionDurations, motionEase } from "../../design-system/motion";
import { ApprovalOrbit } from "../brand/StudioSignals";
import { AppointmentTimeline } from "../ui/AppointmentTimeline";
import { AnimatedLivingQRCode } from "./AnimatedLivingQRCode";
import { BrandHeader } from "./BrandHeader";

export function PendingApprovalView({ flow }: { flow: BookingFlow }) {
  const reduceMotion = useReducedMotion();
  const dateLabel = format(
    new Date(`${flow.selectedDate}T12:00:00`),
    "d MMMM EEEE",
    { locale: tr },
  );

  return (
    <div className="app-shell pending-shell">
      <section
        className="compact-brand-stage"
        aria-label="Ramazan İnanç Hair Art Studio"
      >
        <BrandHeader dataMode={flow.dataMode} mapsUrl={flow.mapsUrl} />
      </section>
      <main className="pending-layout">
        <motion.section
          className="pending-card"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionDurations.page, ease: motionEase }}
        >
          <ApprovalOrbit />
          <span className="pending-eyebrow">Talebin stüdyoya ulaştı</span>
          <h1>Yönetici onayı bekleniyor.</h1>
          <p className="pending-lead">Sonucu SMS ile bildireceğiz.</p>

          <div className="pending-pass-layout">
            <div className="pending-pass-copy">
              <div className="reference-card">
                <span>Randevu referansı</span>
                <strong>{flow.successCode}</strong>
              </div>

              <div className="pending-details">
                <div>
                  <CalendarBlankIcon size={20} weight="duotone" />
                  <span>
                    <small>Tarih</small>
                    <strong>{dateLabel}</strong>
                  </span>
                </div>
                <div>
                  <ClockIcon size={20} weight="duotone" />
                  <span>
                    <small>Saat ve süre</small>
                    <strong>
                      {flow.selectedSlot?.startTime} · {flow.totalDuration} dk
                    </strong>
                  </span>
                </div>
                <div>
                  <UserCircleIcon size={20} weight="duotone" />
                  <span>
                    <small>Uzman</small>
                    <strong>
                      {flow.selectedProfessional?.name ?? "İlk müsait uzman"}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="pending-services">
                <span>Hizmet</span>
                <strong>{flow.selectedServices[0]?.name}</strong>
              </div>

              <AppointmentTimeline />
            </div>

            <AnimatedLivingQRCode
              value={`${window.location.origin}/hesabim/randevular/${encodeURIComponent(flow.successCode)}`}
              code={flow.successCode}
              statusLabel="Onay süreci canlı"
            />
          </div>

          {flow.dataMode === "preview" && (
            <p className="preview-disclaimer">
              Bu talep tasarım önizlemesinde simüle edildi; gerçek bir randevu
              oluşturulmadı.
            </p>
          )}

          <button
            type="button"
            className="ri-button ri-button--primary"
            onClick={flow.reset}
          >
            Yeni randevu oluştur <ArrowRightIcon size={18} weight="bold" />
          </button>
        </motion.section>
      </main>
    </div>
  );
}
