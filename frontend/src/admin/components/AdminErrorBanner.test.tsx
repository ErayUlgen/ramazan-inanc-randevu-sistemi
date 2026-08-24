import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminErrorBanner } from "./AdminErrorBanner";

describe("AdminErrorBanner", () => {
  it("randevu çakışmasını anlaşılır bir mesajla gösterir", () => {
    render(
      <AdminErrorBanner
        title="Talep kuyruğu güncellenemedi"
        error="Bu saat başka bir randevu veya zaman bloğu tarafından önce dolduruldu."
        fallback="Talep listesi yenilenemedi."
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("Bu saat artık müsait değil")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Takvim az önce değişti. Yenileyip uygun saatlerden birini seçebilirsin.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /takvimi yenile/i }),
    ).toBeInTheDocument();
  });
});
