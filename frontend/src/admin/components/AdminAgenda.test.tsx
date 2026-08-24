import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AdminBooking } from "../admin.types";
import { AdminAgenda } from "./AdminAgenda";

const booking = {
  id: "booking-1",
  publicCode: "RI-TEST0001",
  status: "PENDING_APPROVAL",
  source: "ONLINE",
  visitStatus: "SCHEDULED",
  startAt: "2030-07-22T15:00:00+03:00",
  endAt: "2030-07-22T16:00:00+03:00",
  customerNameSnapshot: "Eray Ülgen",
  professional: {
    id: "professional-1",
    slug: "ramazan-inanc",
    name: "Ramazan İnanç",
    title: "Uzman",
  },
  items: [{ serviceName: "Anatomik Saç Kesimi" }],
} as AdminBooking;

describe("AdminAgenda", () => {
  it("loading, empty ve error durumlarını açıkça gösterir", () => {
    const { rerender } = render(
      <AdminAgenda
        bookings={[]}
        loading
        error=""
        hasMore={false}
        onLoadMore={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/Randevular hazırlanıyor/i)).toBeInTheDocument();

    rerender(
      <AdminAgenda
        bookings={[]}
        loading={false}
        error=""
        hasMore={false}
        onLoadMore={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/Bu aralıkta randevu yok/i)).toBeInTheDocument();

    rerender(
      <AdminAgenda
        bookings={[]}
        loading={false}
        error="Bağlantı kurulamadı"
        hasMore={false}
        onLoadMore={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Bağlantı kurulamadı");
  });

  it("randevuyu gruplayıp detay seçimini tetikler", () => {
    const onSelect = vi.fn();
    render(
      <AdminAgenda
        bookings={[booking]}
        loading={false}
        error=""
        hasMore
        onLoadMore={vi.fn()}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Eray Ülgen/i }));
    expect(onSelect).toHaveBeenCalledWith(booking);
    expect(
      screen.getByRole("button", { name: /Daha fazla göster/i }),
    ).toBeInTheDocument();
  });
});
