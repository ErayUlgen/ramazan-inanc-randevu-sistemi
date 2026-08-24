import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminOperationsReport } from "../admin.types";
import { getAdminOperationsReport } from "../api/adminApi";
import { ReportsPage } from "./ReportsPage";

vi.mock("../api/adminApi", () => ({
  getAdminOperationsReport: vi.fn(),
}));

vi.mock("../components/AdminPageFrame", () => ({
  AdminPageFrame: ({
    actions,
    children,
  }: {
    actions?: ReactNode;
    children: ReactNode;
  }) => (
    <main>
      {actions}
      {children}
    </main>
  ),
}));

const getReport = vi.mocked(getAdminOperationsReport);

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(
      new Date("2026-07-30T09:00:00.000Z").getTime(),
    );
  });

  it("geç dönen eski tarih aralığını güncel raporun üzerine yazmaz", async () => {
    const wide = deferred<AdminOperationsReport>();
    const narrow = deferred<AdminOperationsReport>();
    getReport
      .mockReturnValueOnce(wide.promise)
      .mockReturnValueOnce(narrow.promise);

    render(
      <ReportsPage
        branchId="branch-1"
        onLogout={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(getReport).toHaveBeenCalledWith(
      "2026-07-24",
      "2026-07-30",
      undefined,
      undefined,
      { source: undefined, visitStatus: undefined },
    );

    fireEvent.change(screen.getByLabelText("Başlangıç"), {
      target: { value: "2026-07-29" },
    });
    await waitFor(() => expect(getReport).toHaveBeenCalledTimes(2));

    await act(async () => {
      narrow.resolve(makeReport("2026-07-29", "2026-07-30", 4));
      await narrow.promise;
    });
    expect(kpi("Toplam randevu")).toHaveTextContent("4");

    await act(async () => {
      wide.resolve(makeReport("2026-07-24", "2026-07-30", 13));
      await wide.promise;
    });
    expect(kpi("Toplam randevu")).toHaveTextContent("4");
    expect(kpi("Toplam randevu")).not.toHaveTextContent("13");
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function kpi(label: string) {
  const element = screen.getByText(label).closest("article");
  if (!element) throw new Error(`${label} kartı bulunamadı.`);
  return element;
}

function makeReport(
  from: string,
  to: string,
  appointments: number,
): AdminOperationsReport {
  return {
    range: { from, to },
    totals: {
      appointments,
      pending: 0,
      confirmed: appointments,
      past: 0,
      cancelled: 0,
      noShow: 0,
      waitlistWon: 0,
      occupancyPercent: 0,
      capacityMinutes: 0,
      occupiedMinutes: 0,
      averageApprovalMinutes: null,
      noShowRate: 0,
      cancellationRate: 0,
      recurringBookingRate: 0,
      estimatedPastServiceValueKurus: 0,
      plannedServiceValueKurus: 0,
      averageRating: 0,
      reviewResponseRate: 0,
      reviewDistribution: [],
    },
    professionals: [],
    services: [],
    trend: [],
  };
}
