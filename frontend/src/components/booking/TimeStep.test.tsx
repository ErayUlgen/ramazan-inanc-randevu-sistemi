import { format, startOfToday } from "date-fns";
import { tr } from "date-fns/locale";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoCatalog } from "../../data/demo";
import type { BookingFlow } from "../../hooks/useBookingFlow";
import { TimeStep } from "./TimeStep";

describe("TimeStep", () => {
  it("dolu günde tarihi açıklar ve salonu doğrudan arama aksiyonu sunar", () => {
    const selectedDate = format(startOfToday(), "yyyy-MM-dd");
    const flow = {
      catalog: demoCatalog,
      selectedDate,
      selectedServiceIds: [demoCatalog.services[0].id],
      professionalId: undefined,
      selectedProfessional: undefined,
      selectedSlot: null,
      availability: {
        date: selectedDate,
        timezone: "Europe/Istanbul",
        totalDurationMinutes: 60,
        totalPriceKurus: 90000,
        slots: [],
      },
      totalDuration: 60,
      salonPhone: "+905442631902",
      bookingWindowDays: 30,
      waitlistEnabled: true,
      busy: false,
      error: "",
      selectDate: vi.fn(),
      selectSlot: vi.fn(),
      refreshAvailability: vi.fn(),
      goToStep: vi.fn(),
      beginConfirmation: vi.fn(),
    } as unknown as BookingFlow;

    render(<TimeStep flow={flow} />);

    const dateLabel = format(startOfToday(), "d MMMM EEEE", { locale: tr });
    expect(
      screen.getByText(`${dateLabel} için online saatler doldu.`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Programda kısa bir boşluk oluşabilir/),
    ).toBeInTheDocument();
    expect(screen.getByText("0544 263 19 02")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Salonu ara/i })).toHaveAttribute(
      "href",
      "tel:+905442631902",
    );
    expect(
      screen.queryByRole("button", { name: /müsait.*bul/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Bekleme listesine katıl/i }),
    ).toHaveAttribute("href", expect.stringContaining(`date=${selectedDate}`));
  });

  it("hafta navigasyonunu policy penceresiyle sınırlar", () => {
    const selectedDate = format(startOfToday(), "yyyy-MM-dd");
    const flow = {
      catalog: demoCatalog,
      selectedDate,
      selectedServiceIds: [demoCatalog.services[0].id],
      availability: { slots: [] },
      totalDuration: 60,
      salonPhone: "+905442631902",
      bookingWindowDays: 7,
      busy: false,
      error: "",
      selectDate: vi.fn(),
      selectSlot: vi.fn(),
      refreshAvailability: vi.fn(),
      goToStep: vi.fn(),
      beginConfirmation: vi.fn(),
    } as unknown as BookingFlow;

    render(<TimeStep flow={flow} />);
    const previous = screen.getByRole("button", { name: /Önceki hafta/i });
    const next = screen.getByRole("button", { name: /Sonraki hafta/i });
    expect(previous).toBeDisabled();
    expect(next).not.toBeDisabled();
    fireEvent.click(next);
    expect(next).toBeDisabled();
  });
});
