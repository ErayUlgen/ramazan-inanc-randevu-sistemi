import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoCatalog } from "../data/demo";
import { getCatalog } from "../lib/api";
import { WaitlistJoinPage } from "./WaitlistJoinPage";

vi.mock("../lib/api", () => ({ getCatalog: vi.fn() }));

const emptySessionResponse = {
  ok: true,
  status: 200,
  json: async () => null,
} as Response;

function todayInIstanbul() {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date());
}

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WaitlistJoinPage />
    </MemoryRouter>,
  );
}

describe("WaitlistJoinPage", () => {
  beforeEach(() => {
    vi.mocked(getCatalog).mockResolvedValue(demoCatalog);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(emptySessionResponse));
  });

  it("eksik rezervasyon bağlamında pasif form yerine seçim yönlendirmesi gösterir", async () => {
    renderPage("/bekleme-listesi");

    expect(
      await screen.findByRole("heading", {
        name: "Hizmet ve tarih seçimi eksik.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Hizmet ve tarih seç/i }),
    ).toHaveAttribute("href", "/");
    expect(screen.queryByLabelText("Ad soyad")).not.toBeInTheDocument();
  });

  it("geçerli bağlantıyı hizmet, uzman ve tarihle açar; hataları alanın yanında gösterir", async () => {
    const date = todayInIstanbul();
    renderPage(
      `/bekleme-listesi?branch=${demoCatalog.slug}&services=${demoCatalog.services[0].id}&professional=${demoCatalog.professionals[0].id}&date=${date}`,
    );

    expect(await screen.findByText("Aradığın randevu")).toBeInTheDocument();
    expect(screen.getByText(demoCatalog.services[0].name)).toBeInTheDocument();
    expect(
      screen.getAllByText(demoCatalog.professionals[0].name).length,
    ).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: /Telefonumu doğrula/i }),
    );

    expect(
      await screen.findByText(
        "Adınızı ve soyadınızı en az 2 karakterle yazın.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Telefon numaranızı 05xx xxx xx xx biçiminde yazın."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Ad soyad")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it("güvenli bağlantı tokenı temizlendikten sonra teklif oturumunu açık tutar", async () => {
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const entry = {
      id: "waitlist-entry-1",
      status: "OFFERED",
      fullName: "Eray Ülgen",
      phoneMasked: "+90 555 *** ** 88",
      professional: {
        id: demoCatalog.professionals[0].id,
        name: demoCatalog.professionals[0].name,
      },
      services: [
        {
          id: demoCatalog.services[0].id,
          name: demoCatalog.services[0].name,
          durationMinutes: demoCatalog.services[0].durationMinutes,
        },
      ],
      dateFrom: todayInIstanbul(),
      dateTo: todayInIstanbul(),
      startMinute: 600,
      endMinute: 1260,
      note: null,
      failedOfferCount: 0,
      offers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const offer = {
      id: "offer-1",
      status: "PENDING",
      startAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      endAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
      expiresAt,
      acceptedAt: null,
      totalDurationMinutes: 60,
      totalPriceKurus: 90000,
      professional: entry.professional,
      acceptedBooking: null,
      entry,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => offer,
      } as Response),
    );

    renderPage("/bekleme-listesi/teklif");

    expect(
      await screen.findByRole("button", { name: "Bu saati kabul et" }),
    ).toBeInTheDocument();
    expect(document.body).toHaveTextContent(
      "randevun doğrudan kesinleşir",
    );
  });

  it("süresi dolan güvenli bağlantıyı eksik form gibi değil terminal durum olarak anlatır", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          message:
            "Bu saatin kabul süresi doldu. Bekleme kaydınız yeni boşluklar için aktif kalır.",
        }),
      } as Response),
    );

    renderPage("/bekleme-listesi/teklif/gecersiz-veya-suresi-dolmus-token");

    expect(
      await screen.findByRole("heading", {
        name: "Bu teklif artık açık değil.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Hizmet ve tarih seçimi eksik.")).toBeNull();
  });
});
