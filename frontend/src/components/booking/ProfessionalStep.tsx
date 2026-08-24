import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import type { BookingFlow } from "../../hooks/useBookingFlow";
import { ReservedTimeMark } from "../brand/StudioSignals";
import { ProfessionalAvatar } from "../ui/ProfessionalAvatar";
import { InlineError, StepActions, StepHeader } from "./BookingPrimitives";

export function ProfessionalStep({ flow }: { flow: BookingFlow }) {
  const selectedService = flow.selectedServices[0];
  return (
    <div className="booking-step professional-step">
      <StepHeader eyebrow="2 / 4" title="Uzmanını seç" />

      <button
        type="button"
        className={`professional-option professional-option--recommended ${!flow.professionalId ? "is-selected" : ""}`}
        aria-pressed={!flow.professionalId}
        onClick={() => flow.selectProfessional(undefined)}
      >
        <span className="professional-any-mark" aria-hidden="true">
          <ReservedTimeMark />
        </span>
        <span className="professional-option__copy">
          <span className="recommended-label">Önerilen</span>
          <strong>İlk müsait uzman</strong>
          <small>En geniş saat seçeneği</small>
        </span>
        <span className="selection-control" aria-hidden="true">
          {!flow.professionalId && <CheckIcon size={17} weight="bold" />}
        </span>
      </button>

      <div className="professional-grid" aria-label="Uzmanlarımız">
        {flow.catalog.professionals.map((professional, index) => {
          const selected = flow.professionalId === professional.id;
          return (
            <button
              key={professional.id}
              type="button"
              className={`professional-option ${selected ? "is-selected" : ""}`}
              aria-pressed={selected}
              onClick={() => flow.selectProfessional(professional.id)}
            >
              <ProfessionalAvatar
                name={professional.name}
                selected={selected}
              />
              <span className="professional-option__copy">
                <span className="professional-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <strong>{professional.name}</strong>
                {selectedService &&
                  (() => {
                    const configuration =
                      professional.serviceConfigurations?.find(
                        (item) => item.serviceId === selectedService.id,
                      );
                    const duration =
                      configuration?.durationMinutesOverride ??
                      selectedService.durationMinutes;
                    const price =
                      configuration?.priceKurusOverride ??
                      selectedService.priceKurus;
                    return (
                      <small>
                        {duration} dk ·{" "}
                        {new Intl.NumberFormat("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                          maximumFractionDigits: 0,
                        }).format(price / 100)}
                      </small>
                    );
                  })()}
              </span>
              <span className="selection-control" aria-hidden="true">
                {selected && <CheckIcon size={17} weight="bold" />}
              </span>
            </button>
          );
        })}
      </div>

      <InlineError message={flow.error} />
      <StepActions
        onBack={() => flow.goToStep(1)}
        onNext={flow.continueFromProfessional}
        busy={flow.busy}
        nextLabel="Saatleri gör"
      />
    </div>
  );
}
