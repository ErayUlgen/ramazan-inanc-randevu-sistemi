import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AdminProfessional } from "../admin.types";
import { DayTimeline } from "./DayTimeline";

const professionals: AdminProfessional[] = [
  {
    id: "professional-1",
    slug: "ramazan-inanc",
    name: "Ramazan İnanç",
    title: "Anatomik Saç Kesim Uzmanı",
  },
  {
    id: "professional-2",
    slug: "hikmet-cetin-aygordu",
    name: "Hikmet Çetin Aygördü",
    title: "Anatomik Saç Kesim Uzmanı",
  },
  {
    id: "professional-3",
    slug: "ali-poyraz-yilmaz",
    name: "Ali Poyraz Yılmaz",
    title: "Anatomik Saç Kesim Uzmanı",
  },
  {
    id: "professional-4",
    slug: "velihan-ulusan",
    name: "Velihan Uluşan",
    title: "Anatomik Saç Kesim Uzmanı",
  },
  {
    id: "professional-5",
    slug: "mustafa-akpilic",
    name: "Mustafa Akpiliç",
    title: "Anatomik Saç Kesim Uzmanı",
  },
];

describe("DayTimeline", () => {
  it("renders every professional and exposes a deterministic five-column width", () => {
    const { container } = render(
      <DayTimeline
        date="2026-07-30"
        serverNow="2026-07-30T11:00:00.000Z"
        timezone="Europe/Istanbul"
        openingMinute={600}
        closingMinute={1260}
        professionals={professionals}
        bookings={[]}
        scheduleBlocks={[]}
        workingIntervals={[{ startMinute: 600, endMinute: 1260 }]}
        isClosed={false}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    );

    for (const professional of professionals) {
      expect(screen.getAllByText(professional.name).length).toBeGreaterThan(0);
    }

    const grid = container.querySelector<HTMLElement>(".timeline-grid");
    expect(grid).not.toBeNull();
    expect(grid?.style.getPropertyValue("--timeline-columns")).toBe("5");
    expect(grid?.style.getPropertyValue("--timeline-min-width")).toBe("804px");
  });
});
