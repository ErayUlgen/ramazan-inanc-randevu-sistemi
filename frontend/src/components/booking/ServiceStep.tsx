import { motion, useReducedMotion } from "framer-motion";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { useMemo, useState } from "react";
import type { BookingFlow } from "../../hooks/useBookingFlow";
import { motionDurations, motionEase } from "../../design-system/motion";
import { InlineError, StepActions, StepHeader } from "./BookingPrimitives";

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

const serviceAudiences = ["Erkek Hizmetleri", "Kadın Hizmetleri"] as const;
type ServiceAudience = (typeof serviceAudiences)[number];

const getServiceAudience = (category: string): ServiceAudience =>
  category === "Kadın Hizmetleri" ? "Kadın Hizmetleri" : "Erkek Hizmetleri";

export function ServiceStep({ flow }: { flow: BookingFlow }) {
  const [category, setCategory] = useState<ServiceAudience>("Erkek Hizmetleri");
  const reduceMotion = useReducedMotion();
  const services = useMemo(
    () =>
      flow.catalog.services.filter(
        (service) => getServiceAudience(service.category) === category,
      ),
    [category, flow.catalog.services],
  );

  const changeCategory = (nextCategory: ServiceAudience) => {
    if (nextCategory === category) return;
    setCategory(nextCategory);
    const selectedService = flow.selectedServices[0];
    if (
      selectedService &&
      getServiceAudience(selectedService.category) !== nextCategory
    ) {
      flow.clearServiceSelection();
    }
  };

  return (
    <div className="booking-step service-step">
      <StepHeader
        eyebrow="1 / 4"
        title="Hizmetini seç"
        description="Randevu başına bir hizmet seç."
        meta={<span className="selection-count">Tek hizmet</span>}
      />

      <div
        className="category-tabs category-tabs--audience"
        role="tablist"
        aria-label="Hizmet grubu"
      >
        {serviceAudiences.map((item, index) => (
          <motion.button
            key={item}
            type="button"
            role="tab"
            aria-selected={category === item}
            className={category === item ? "is-active" : ""}
            onClick={() => changeCategory(item)}
            initial={reduceMotion ? false : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: motionDurations.micro,
              delay: reduceMotion ? 0 : index * 0.025,
              ease: motionEase,
            }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          >
            {item}
          </motion.button>
        ))}
      </div>

      <div className="service-grid" aria-label={category}>
        {services.map((service) => {
          const selected = flow.selectedServiceIds.includes(service.id);
          return (
            <button
              key={service.id}
              type="button"
              className={`service-option ${selected ? "is-selected" : ""}`}
              aria-pressed={selected}
              onClick={() => flow.selectService(service.id)}
            >
              <span className="service-option__topline">
                <span className="service-category">
                  {getServiceAudience(service.category)}
                </span>
                <span className="selection-control" aria-hidden="true">
                  {selected && <CheckIcon size={17} weight="bold" />}
                </span>
              </span>
              <span className="service-option__copy">
                <strong>{service.name}</strong>
              </span>
              <span className="service-option__meta">
                <span>
                  <ClockIcon size={16} weight="bold" />{" "}
                  {service.variesByProfessional
                    ? `${service.durationRange?.min ?? service.durationMinutes} dk’dan başlayan`
                    : `${service.durationMinutes} dk`}
                </span>
                <strong>
                  {service.variesByProfessional
                    ? `${currency.format((service.priceRange?.min ?? service.priceKurus) / 100)}’den başlayan`
                    : currency.format(service.priceKurus / 100)}
                </strong>
              </span>
              {service.variesByProfessional && (
                <small className="service-option__variation">
                  Kesin süre ve ücret uzman seçiminde belirlenir.
                </small>
              )}
            </button>
          );
        })}
      </div>

      <InlineError message={flow.error} />
      <StepActions
        onNext={flow.continueFromServices}
        disabled={!flow.selectedServiceIds.length}
        busy={flow.busy}
        nextLabel="Uzman seçimine geç"
      />
    </div>
  );
}
