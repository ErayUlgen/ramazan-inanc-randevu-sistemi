import { format, startOfToday } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BookingStep,
  ConfirmationValues,
  DataMode,
} from "../components/booking/booking.types";
import {
  getCustomerRebookSuggestion,
  getCustomerSession,
} from "../customer-account/customerAccountApi";
import type {
  CustomerProfile,
  CustomerRebookSuggestion,
} from "../customer-account/customerAccountTypes";
import { demoCatalog } from "../data/demo";
import { buildDemoAvailability } from "../lib/availability";
import {
  confirmBookingHold,
  createBookingHold,
  getAvailability,
  getBookingPolicy,
  getCatalog,
  requestBookingConfirmationCode,
} from "../lib/api";
import type {
  AvailabilityResponse,
  AvailabilitySlot,
  BookingHold,
  BranchCatalog,
} from "../types";

const BRANCH_SLUG = "hair-art-ramazan-inanc-denizli";
const SALON_PHONE_FALLBACK = "+905442631902";
const SALON_MAPS_FALLBACK =
  "https://www.google.com/maps/place//data=!4m2!3m1!1s0x14c741125ac99709:0xad2bff10cae2c3ed?sa=X&ved=1t:8290&ictx=111";

export function useBookingFlow() {
  const [catalog, setCatalog] = useState<BranchCatalog>(demoCatalog);
  const [dataMode, setDataMode] = useState<DataMode>(
    import.meta.env.DEV ? "preview" : "unavailable",
  );
  const [step, setStep] = useState<BookingStep>(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [professionalId, setProfessionalId] = useState<string>();
  const [selectedDate, setSelectedDate] = useState(
    format(startOfToday(), "yyyy-MM-dd"),
  );
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(
    null,
  );
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null,
  );
  const [hold, setHold] = useState<BookingHold | null>(null);
  const [holdSeconds, setHoldSeconds] = useState(300);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successCode, setSuccessCode] = useState("");
  const [availabilityNonce, setAvailabilityNonce] = useState(0);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [verificationChallengeId, setVerificationChallengeId] = useState("");
  const [verificationPhone, setVerificationPhone] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [salonPhone, setSalonPhone] = useState(SALON_PHONE_FALLBACK);
  const [mapsUrl, setMapsUrl] = useState(SALON_MAPS_FALLBACK);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [bookingWindowDays, setBookingWindowDays] = useState(30);
  const [connectionNonce, setConnectionNonce] = useState(0);
  const [onlineBookingRestricted, setOnlineBookingRestricted] = useState(false);
  const [rebookSuggestion, setRebookSuggestion] =
    useState<CustomerRebookSuggestion | null>(null);
  const [rebookMessage, setRebookMessage] = useState("");
  const availabilitySequence = useRef(0);

  useEffect(() => {
    let active = true;
    getCustomerSession()
      .then((session) => {
        if (active) {
          setCustomer(session.authenticated ? session.customer : null);
        }
      })
      .catch(() => {
        if (active) setCustomer(null);
      })
      .finally(() => {
        if (active) setSessionChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setError("");
    getCatalog(BRANCH_SLUG)
      .then((response) => {
        setCatalog(response);
        setSelectedServiceIds([]);
        setProfessionalId(undefined);
        setDataMode("live");
      })
      .catch(() => {
        if (import.meta.env.DEV) {
          setCatalog(demoCatalog);
          setDataMode("preview");
        } else {
          setDataMode("unavailable");
        }
      });
  }, [connectionNonce]);

  useEffect(() => {
    if (dataMode !== "live" || sessionChecking) return;
    const publicCode = new URLSearchParams(window.location.search).get(
      "rebook",
    );
    if (!publicCode) return;
    let active = true;
    void getCustomerRebookSuggestion(publicCode)
      .then((suggestion) => {
        if (!active) return;
        setRebookSuggestion(suggestion);
        setRebookMessage(suggestion.message);
        if (
          suggestion.service &&
          catalog.services.some(
            (service) => service.id === suggestion.service!.id,
          )
        ) {
          setSelectedServiceIds([suggestion.service.id]);
          setProfessionalId(
            suggestion.professional &&
              catalog.professionals.some(
                (professional) =>
                  professional.id === suggestion.professional!.id,
              )
              ? suggestion.professional.id
              : undefined,
          );
          setStep(3);
        } else {
          setStep(1);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setRebookMessage(
            reason instanceof Error
              ? reason.message
              : "Son randevu bilgisi hazırlanamadı.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [catalog.professionals, catalog.services, dataMode, sessionChecking]);

  useEffect(() => {
    getBookingPolicy(BRANCH_SLUG)
      .then((policy) => {
        if (policy.salonPhone?.trim()) setSalonPhone(policy.salonPhone.trim());
        if (policy.mapsUrl?.trim()) setMapsUrl(policy.mapsUrl.trim());
        setWhatsappPhone(policy.whatsappPhone?.trim() ?? "");
        setWaitlistEnabled(policy.waitlistEnabled);
        setBookingWindowDays(policy.bookingWindowDays);
      })
      .catch(() => {
        // İletişim kartı, politika servisi geçici olarak erişilemese de çalışır.
      });
  }, [connectionNonce]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(
      () => setResendSeconds((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const selectedServices = useMemo(
    () =>
      catalog.services.filter((service) =>
        selectedServiceIds.includes(service.id),
      ),
    [catalog.services, selectedServiceIds],
  );
  const selectedProfessional = catalog.professionals.find(
    (professional) => professional.id === professionalId,
  );
  const selectedProfessionalAvailability = availability?.professionals?.find(
    (professional) => professional.id === professionalId,
  );
  const selectedProfessionalConfiguration =
    selectedServices.length === 1
      ? selectedProfessional?.serviceConfigurations?.find(
          (configuration) => configuration.serviceId === selectedServices[0].id,
        )
      : undefined;
  const totalDuration =
    hold?.totalDurationMinutes ??
    selectedProfessionalAvailability?.totalDurationMinutes ??
    selectedServices.reduce(
      (sum, service) =>
        sum +
        (selectedProfessionalConfiguration?.durationMinutesOverride ??
          (selectedProfessional ? undefined : service.durationRange?.min) ??
          service.durationMinutes),
      0,
    );
  const totalPrice =
    hold?.totalPriceKurus ??
    selectedProfessionalAvailability?.totalPriceKurus ??
    selectedServices.reduce(
      (sum, service) =>
        sum +
        (selectedProfessionalConfiguration?.priceKurusOverride ??
          (selectedProfessional ? undefined : service.priceRange?.min) ??
          service.priceKurus),
      0,
    );

  useEffect(() => {
    if (step !== 3 || !selectedServiceIds.length || dataMode === "unavailable")
      return;

    const requestId = ++availabilitySequence.current;
    let active = true;
    setSelectedSlot(null);
    setError("");
    setBusy(true);

    const availabilityRequest =
      dataMode === "live"
        ? getAvailability(
            catalog.slug,
            selectedDate,
            selectedServiceIds,
            professionalId,
          )
        : import.meta.env.DEV
          ? Promise.resolve(
              buildDemoAvailability(
                catalog,
                selectedDate,
                selectedServiceIds,
                professionalId,
              ),
            )
          : Promise.reject(new Error("Online randevu servisine ulaşılamıyor."));

    availabilityRequest
      .then((response) => {
        if (active && requestId === availabilitySequence.current) {
          setAvailability(response);
        }
      })
      .catch((caught: unknown) => {
        if (!active || requestId !== availabilitySequence.current) return;
        setAvailability(null);
        setError(
          caught instanceof Error ? caught.message : "Saatler yüklenemedi.",
        );
      })
      .finally(() => {
        if (active && requestId === availabilitySequence.current)
          setBusy(false);
      });

    return () => {
      active = false;
    };
  }, [
    availabilityNonce,
    catalog,
    dataMode,
    professionalId,
    selectedDate,
    selectedServiceIds,
    step,
  ]);

  useEffect(() => {
    if (!hold) return;

    const update = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(hold.holdExpiresAt).getTime() - Date.now()) / 1000),
      );
      setHoldSeconds(remaining);
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [hold]);

  const clearVerification = () => {
    setVerificationChallengeId("");
    setVerificationPhone("");
    setDevelopmentCode("");
    setResendSeconds(0);
  };

  const clearDownstreamSelection = () => {
    setSelectedSlot(null);
    setHold(null);
    setSuccessCode("");
    clearVerification();
  };

  const selectService = (id: string) => {
    if (selectedServiceIds.length === 1 && selectedServiceIds[0] === id) return;
    setSelectedServiceIds([id]);
    setProfessionalId(undefined);
    clearDownstreamSelection();
  };

  const clearServiceSelection = () => {
    if (!selectedServiceIds.length) return;
    setSelectedServiceIds([]);
    setProfessionalId(undefined);
    clearDownstreamSelection();
  };

  const changeRebookSelection = () => {
    setStep(1);
    setProfessionalId(undefined);
  };

  const selectProfessional = (id?: string) => {
    setProfessionalId(id);
    clearDownstreamSelection();
  };

  const selectDate = (date: string) => {
    setSelectedDate(date);
    clearDownstreamSelection();
  };

  const selectSlot = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    setHold(null);
    clearVerification();
  };

  const refreshAvailability = () => {
    setError("");
    setAvailabilityNonce((current) => current + 1);
  };

  const retryConnection = () => {
    setError("");
    setConnectionNonce((current) => current + 1);
  };

  const goToStep = (nextStep: BookingStep) => {
    if (nextStep > step) return;
    setError("");
    setStep(nextStep);
  };

  const continueFromServices = () => {
    setError("");
    if (selectedServiceIds.length !== 1) {
      setError("Devam etmek için bir hizmet seçmelisin.");
      return;
    }
    setStep(2);
  };

  const continueFromProfessional = () => {
    setError("");
    setStep(3);
  };

  const beginConfirmation = async () => {
    if (!selectedSlot) {
      setError("Devam etmek için uygun bir saat seçmelisin.");
      return;
    }

    setBusy(true);
    setError("");
    clearVerification();
    try {
      const response =
        dataMode === "live"
          ? await createBookingHold({
              branchSlug: catalog.slug,
              serviceIds: selectedServiceIds,
              professionalId,
              date: selectedDate,
              startTime: selectedSlot.startTime,
            })
          : import.meta.env.DEV
            ? {
                id: "demo-hold",
                publicCode: "RI-DEMO",
                holdToken: "demo-token",
                holdExpiresAt: new Date(Date.now() + 300_000).toISOString(),
              }
            : (() => {
                throw new Error("Online randevu servisine ulaşılamıyor.");
              })();

      setHold(response);
      setStep(4);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Saat geçici olarak ayrılamadı.",
      );
    } finally {
      setBusy(false);
    }
  };

  const requestVerificationCode = async (phone: string) => {
    if (!hold || holdSeconds <= 0 || customer) return false;
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Doğrulama kodu için geçerli bir cep telefonu yazmalısın.");
      return false;
    }

    setBusy(true);
    setError("");
    try {
      const response =
        dataMode === "live"
          ? await requestBookingConfirmationCode(hold.id, {
              phone,
              holdToken: hold.holdToken,
            })
          : import.meta.env.DEV
            ? {
                accepted: true as const,
                challengeId: "demo-challenge",
                resendAfterSeconds: 60,
                developmentCode: "111111",
              }
            : (() => {
                throw new Error("SMS doğrulama servisine ulaşılamıyor.");
              })();
      setVerificationChallengeId(response.challengeId);
      setVerificationPhone(phone.replace(/\D/g, ""));
      setDevelopmentCode(response.developmentCode ?? "");
      setResendSeconds(response.resendAfterSeconds);
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Doğrulama kodu gönderilemedi.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitBooking = async (values: ConfirmationValues) => {
    if (!hold || holdSeconds <= 0) {
      setError("Ayırdığımız sürenin sonuna geldik. Lütfen saati yeniden seç.");
      return;
    }
    if (
      !customer &&
      (values.fullName.trim().length < 2 ||
        values.phone.replace(/\D/g, "").length < 10)
    ) {
      setError("Adını ve geçerli cep telefonu numaranı kontrol etmelisin.");
      return;
    }
    if (
      !customer &&
      (!verificationChallengeId ||
        verificationPhone !== values.phone.replace(/\D/g, "") ||
        values.verificationCode.length !== 6)
    ) {
      setError("Telefonuna gönderilen 6 haneli doğrulama kodunu girmelisin.");
      return;
    }

    setBusy(true);
    setError("");
    setOnlineBookingRestricted(false);
    try {
      const result =
        dataMode === "live"
          ? await confirmBookingHold(hold.id, {
              ...(customer
                ? {}
                : {
                    fullName: values.fullName,
                    phone: values.phone,
                    verificationCode: values.verificationCode,
                    challengeId: verificationChallengeId,
                  }),
              note: values.note,
              holdToken: hold.holdToken,
            })
          : import.meta.env.DEV
            ? {
                publicCode: `RI-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
                status: "PENDING_APPROVAL",
                message: "Randevu talebi önizlemesi oluşturuldu.",
              }
            : (() => {
                throw new Error("Online randevu servisine ulaşılamıyor.");
              })();

      setSuccessCode(result.publicCode);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Randevu talebi gönderilemedi.";
      setOnlineBookingRestricted(message.includes("Salon ekibimiz"));
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(1);
    setSelectedServiceIds([]);
    setProfessionalId(undefined);
    setSelectedDate(format(startOfToday(), "yyyy-MM-dd"));
    setAvailability(null);
    setSelectedSlot(null);
    setHold(null);
    setHoldSeconds(300);
    setError("");
    setSuccessCode("");
    clearVerification();
  };

  return {
    catalog,
    dataMode,
    step,
    selectedServiceIds,
    selectedServices,
    professionalId,
    selectedProfessional,
    selectedDate,
    selectedSlot,
    availability,
    totalDuration,
    totalPrice,
    hold,
    holdSeconds,
    busy,
    error,
    successCode,
    customer,
    sessionChecking,
    verificationChallengeId,
    developmentCode,
    resendSeconds,
    salonPhone,
    mapsUrl,
    whatsappPhone,
    waitlistEnabled,
    bookingWindowDays,
    onlineBookingRestricted,
    rebookSuggestion,
    rebookMessage,
    selectService,
    clearServiceSelection,
    changeRebookSelection,
    selectProfessional,
    selectDate,
    selectSlot,
    refreshAvailability,
    retryConnection,
    goToStep,
    continueFromServices,
    continueFromProfessional,
    beginConfirmation,
    requestVerificationCode,
    submitBooking,
    reset,
  };
}

export type BookingFlow = ReturnType<typeof useBookingFlow>;
