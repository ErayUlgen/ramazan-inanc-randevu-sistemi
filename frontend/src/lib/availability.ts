import type { AvailabilityResponse, BranchCatalog } from "../types";

interface BusyInterval {
  start: number;
  end: number;
}

const busyByProfessional: Record<string, BusyInterval[]> = {
  "ramazan-inanc": [
    { start: 600, end: 645 },
    { start: 660, end: 720 },
    { start: 900, end: 975 },
  ],
  "hikmet-cetin-aygordu": [{ start: 720, end: 780 }],
  "ali-poyraz-yilmaz": [{ start: 840, end: 900 }],
  "velihan-uluşan": [{ start: 1080, end: 1140 }],
  "mustafa-akpilic": [{ start: 600, end: 660 }],
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const toTime = (minute: number) =>
  `${Math.floor(minute / 60)
    .toString()
    .padStart(2, "0")}:${(minute % 60).toString().padStart(2, "0")}`;

const startsForProfessional = (
  opening: number,
  closing: number,
  duration: number,
  busy: BusyInterval[],
) => {
  const candidates = new Set<number>();
  for (let minute = opening; minute < closing; minute += 60)
    candidates.add(minute);
  busy.forEach((interval) => candidates.add(interval.end));
  return [...candidates]
    .sort((a, b) => a - b)
    .filter(
      (start) =>
        start + duration <= closing &&
        !busy.some(
          (interval) =>
            start < interval.end && start + duration > interval.start,
        ),
    );
};

export const buildDemoAvailability = (
  catalog: BranchCatalog,
  date: string,
  serviceIds: string[],
  professionalId?: string,
): AvailabilityResponse => {
  const services = catalog.services.filter((service) =>
    serviceIds.includes(service.id),
  );
  const duration = services.reduce(
    (sum, service) => sum + service.durationMinutes,
    0,
  );
  const price = services.reduce((sum, service) => sum + service.priceKurus, 0);
  const eligible = catalog.professionals.filter(
    (professional) =>
      (!professionalId || professional.id === professionalId) &&
      serviceIds.every((serviceId) =>
        professional.serviceIds.includes(serviceId),
      ),
  );
  const grouped = new Map<number, string[]>();

  eligible.forEach((professional) => {
    startsForProfessional(
      timeToMinutes(catalog.openingTime),
      timeToMinutes(catalog.closingTime),
      duration,
      busyByProfessional[professional.id] ?? [],
    ).forEach((start) =>
      grouped.set(start, [...(grouped.get(start) ?? []), professional.id]),
    );
  });

  return {
    date,
    timezone: catalog.timezone,
    totalDurationMinutes: duration,
    totalPriceKurus: price,
    slots: [...grouped.entries()].map(([start, availableProfessionalIds]) => ({
      startTime: toTime(start),
      endTime: toTime(start + duration),
      availableProfessionalIds,
    })),
  };
};
