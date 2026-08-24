import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { demoCatalog } from "../../data/demo";
import type { BookingFlow } from "../../hooks/useBookingFlow";
import { ServiceStep } from "./ServiceStep";

const createFlow = (overrides: Partial<BookingFlow> = {}) =>
  ({
    catalog: demoCatalog,
    selectedServiceIds: [],
    selectedServices: [],
    busy: false,
    error: "",
    selectService: vi.fn(),
    clearServiceSelection: vi.fn(),
    continueFromServices: vi.fn(),
    ...overrides,
  }) as BookingFlow;

describe("ServiceStep", () => {
  it("hizmetleri yalnızca erkek ve kadın ana gruplarında gösterir", () => {
    render(<ServiceStep flow={createFlow()} />);

    expect(screen.queryByRole("tab", { name: "Tümü" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Bakım & Şekillendirme" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Saç Yıkama & Şekillendirme")).toBeInTheDocument();
    expect(
      screen.queryByText("Kadın Anatomik Saç Kesimi"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Kadın Hizmetleri" }));

    expect(screen.getByText("Kadın Anatomik Saç Kesimi")).toBeInTheDocument();
    expect(
      screen.queryByText("Saç Yıkama & Şekillendirme"),
    ).not.toBeInTheDocument();
  });

  it("başka gruba geçildiğinde görünmeyen seçimi temizler ve hizmeti tek seçim olarak iletir", () => {
    const selectedService = demoCatalog.services[0];
    const clearServiceSelection = vi.fn();
    const selectService = vi.fn();
    render(
      <ServiceStep
        flow={createFlow({
          selectedServiceIds: [selectedService.id],
          selectedServices: [selectedService],
          clearServiceSelection,
          selectService,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Kadın Hizmetleri" }));
    expect(clearServiceSelection).toHaveBeenCalledOnce();

    fireEvent.click(
      screen.getByRole("button", { name: /Kadın Anatomik Saç Kesimi/i }),
    );
    expect(selectService).toHaveBeenCalledWith("kadin-anatomik-sac-kesimi");
  });
});
