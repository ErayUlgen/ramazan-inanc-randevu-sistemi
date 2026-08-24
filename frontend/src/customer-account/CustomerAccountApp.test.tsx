import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCustomerBookings,
  getCustomerProfile,
  getCustomerSession,
  updateCustomerProfile,
} from "./customerAccountApi";
import { CustomerAccountApp } from "./CustomerAccountApp";
import type {
  CustomerBookingSummary,
  CustomerProfile,
} from "./customerAccountTypes";

vi.mock("./customerAccountApi", async () => {
  const actual =
    await vi.importActual<typeof import("./customerAccountApi")>(
      "./customerAccountApi",
    );
  return {
    ...actual,
    getCustomerBookings: vi.fn(),
    getCustomerProfile: vi.fn(),
    getCustomerSession: vi.fn(),
    updateCustomerProfile: vi.fn(),
  };
});

const customer: CustomerProfile = {
  id: "customer-1",
  fullName: "Ada Müşteri",
  phone: "+905551112233",
  email: "ada@example.com",
  smsNotificationsEnabled: true,
};

function booking(index: number): CustomerBookingSummary {
  return {
    id: `booking-${index}`,
    publicCode: `RI-${String(index).padStart(4, "0")}`,
    status: "CONFIRMED",
    visitStatus: "COMPLETED",
    startAt: `2026-07-${String(Math.max(1, 20 - index)).padStart(2, "0")}T09:00:00.000Z`,
    endAt: `2026-07-${String(Math.max(1, 20 - index)).padStart(2, "0")}T10:00:00.000Z`,
    totalDurationMinutes: 60,
    totalPriceKurus: 100_000,
    revision: 1,
    notificationsEnabled: true,
    seriesId: null,
    occurrenceIndex: null,
    isSeriesException: false,
    professional: {
      id: "professional-1",
      name: "Ramazan İnanç",
      title: "Hair Artist",
    },
    branch: {
      name: "Ramazan İnanç Hair Art Studio",
      city: "Denizli",
      district: "Merkezefendi",
    },
    items: [
      {
        id: `item-${index}`,
        serviceId: "service-1",
        serviceName: `Hizmet ${index}`,
        durationMinutes: 60,
        priceKurus: 100_000,
        preVisitInstructions: null,
        postVisitInstructions: null,
      },
    ],
    activeChangeRequest: null,
  };
}

function renderAccount(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/hesabim/*" element={<CustomerAccountApp />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CustomerAccountApp", () => {
  beforeEach(() => {
    vi.mocked(getCustomerSession).mockResolvedValue({
      authenticated: true,
      expiresAt: "2026-08-30T10:00:00.000Z",
      customer,
    });
    vi.mocked(getCustomerProfile).mockResolvedValue(customer);
    vi.mocked(updateCustomerProfile).mockImplementation(async (payload) => ({
      ...customer,
      ...payload,
      email: payload.email || null,
    }));
  });

  it("geçmişi önce beş kayıt gösterir, sonra cursor ile yükleyip tekrarları ayıklar", async () => {
    vi.mocked(getCustomerBookings).mockImplementation(
      async (view, cursor) => {
        if (view !== "history") return { items: [], nextCursor: null };
        if (cursor === "history-cursor-1") {
          return {
            items: [booking(6), booking(7), booking(8)],
            nextCursor: null,
          };
        }
        return {
          items: [1, 2, 3, 4, 5, 6].map(booking),
          nextCursor: "history-cursor-1",
        };
      },
    );

    renderAccount("/hesabim");

    expect(await screen.findByText("Hizmet 5")).toBeInTheDocument();
    expect(screen.queryByText("Hizmet 6")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "1 randevu daha göster" }),
    );
    expect(await screen.findByText("Hizmet 6")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Daha fazla geçmiş yükle" }),
    );

    expect(await screen.findByText("Hizmet 8")).toBeInTheDocument();
    expect(screen.getAllByText("Hizmet 6")).toHaveLength(1);
    expect(getCustomerBookings).toHaveBeenCalledWith(
      "history",
      "history-cursor-1",
      undefined,
    );
  });

  it("profil kaydını yalnız değişiklikte açar ve yeni düzenlemede başarı mesajını temizler", async () => {
    vi.mocked(getCustomerBookings).mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    renderAccount("/hesabim/profil");

    const nameInput = await screen.findByDisplayValue("Ada Müşteri");
    const saveButton = screen.getByRole("button", {
      name: "Değişiklikleri kaydet",
    });
    await waitFor(() => expect(saveButton).toBeDisabled());

    fireEvent.change(nameInput, { target: { value: "Ada Yeni" } });
    expect(saveButton).toBeEnabled();
    expect(
      screen.getByText("Kaydedilmemiş değişikliklerin var."),
    ).toBeInTheDocument();

    fireEvent.click(saveButton);
    expect(
      await screen.findByText("Değişikliklerin kaydedildi."),
    ).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: "Ada Son" } });
    expect(
      screen.queryByText("Değişikliklerin kaydedildi."),
    ).not.toBeInTheDocument();
    expect(saveButton).toBeEnabled();
  });

  it("bir bölüm hata verdiğinde başarılı boş bölümleri ayrı gösterir", async () => {
    vi.mocked(getCustomerBookings).mockImplementation(async (view) => {
      if (view === "history") throw new Error("Geçmiş servisine ulaşılamadı");
      return { items: [], nextCursor: null };
    });

    renderAccount("/hesabim");

    expect(
      await screen.findByText("Bu bölüm yüklenemedi"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Yaklaşan bir randevun bulunmuyor."),
    ).toBeInTheDocument();
    expect(screen.getByText("Geçmiş servisine ulaşılamadı")).toBeInTheDocument();
  });

  it("profil yenileme hatasını mevcut oturum bilgisini kaybetmeden gösterir", async () => {
    vi.mocked(getCustomerProfile).mockRejectedValueOnce(
      new Error("Bağlantı kurulamadı"),
    );

    renderAccount("/hesabim/profil");

    expect(await screen.findByText("Ada Müşteri")).toBeInTheDocument();
    expect(
      await screen.findByText("Güncel bilgiler alınamadı"),
    ).toBeInTheDocument();
    expect(screen.getByText("Bağlantı kurulamadı")).toBeInTheDocument();
  });
});
