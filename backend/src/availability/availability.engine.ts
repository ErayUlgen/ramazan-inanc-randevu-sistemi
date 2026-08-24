import { Injectable } from '@nestjs/common';

export interface BusyInterval {
  startMinute: number;
  endMinute: number;
}

export interface WorkingInterval {
  startMinute: number;
  endMinute: number;
}

export interface RelativeAvailabilitySegment {
  startOffsetMinutes: number;
  endOffsetMinutes: number;
}

@Injectable()
export class AvailabilityEngine {
  buildCandidateStarts(
    openingMinute: number,
    closingMinute: number,
    durationMinutes: number,
    busyIntervals: BusyInterval[],
  ): number[] {
    return this.buildCandidateStartsForIntervals(
      [{ startMinute: openingMinute, endMinute: closingMinute }],
      durationMinutes,
      busyIntervals,
      60,
    );
  }

  buildCandidateStartsForIntervals(
    workingIntervals: WorkingInterval[],
    durationMinutes: number,
    busyIntervals: BusyInterval[],
    cadenceMinutes = 60,
    minimumStartMinute = 0,
  ): number[] {
    if (durationMinutes <= 0 || cadenceMinutes <= 0) return [];

    const candidates = new Set<number>();
    for (const working of workingIntervals) {
      if (working.startMinute >= working.endMinute) continue;
      for (
        let minute = working.startMinute;
        minute < working.endMinute;
        minute += cadenceMinutes
      ) {
        candidates.add(minute);
      }
    }
    for (const interval of busyIntervals) {
      if (
        workingIntervals.some(
          (working) =>
            interval.endMinute > working.startMinute &&
            interval.endMinute < working.endMinute,
        )
      ) {
        candidates.add(interval.endMinute);
      }
    }

    return [...candidates]
      .sort((a, b) => a - b)
      .filter((startMinute) => {
        const endMinute = startMinute + durationMinutes;
        if (startMinute < minimumStartMinute) return false;
        if (
          !workingIntervals.some(
            (working) =>
              startMinute >= working.startMinute &&
              endMinute <= working.endMinute,
          )
        )
          return false;
        return !busyIntervals.some(
          (busy) =>
            startMinute < busy.endMinute && endMinute > busy.startMinute,
        );
      });
  }

  buildCandidateStartsForPattern(
    workingIntervals: WorkingInterval[],
    appointmentDurationMinutes: number,
    occupancyPattern: RelativeAvailabilitySegment[],
    busyIntervals: BusyInterval[],
    cadenceMinutes = 60,
    minimumStartMinute = 0,
  ): number[] {
    if (
      appointmentDurationMinutes <= 0 ||
      cadenceMinutes <= 0 ||
      !occupancyPattern.length
    ) {
      return [];
    }

    const candidates = new Set<number>();
    for (const working of workingIntervals) {
      if (working.startMinute >= working.endMinute) continue;
      for (
        let minute = working.startMinute;
        minute < working.endMinute;
        minute += cadenceMinutes
      ) {
        candidates.add(minute);
      }
    }

    for (const busy of busyIntervals) {
      for (const segment of occupancyPattern) {
        candidates.add(busy.endMinute - segment.startOffsetMinutes);
      }
    }

    return [...candidates]
      .sort((a, b) => a - b)
      .filter((startMinute) => {
        if (startMinute < minimumStartMinute) return false;
        const customerEnd = startMinute + appointmentDurationMinutes;
        if (
          !workingIntervals.some(
            (working) =>
              startMinute >= working.startMinute &&
              customerEnd <= working.endMinute,
          )
        ) {
          return false;
        }

        return occupancyPattern.every((segment) => {
          const segmentStart = startMinute + segment.startOffsetMinutes;
          const segmentEnd = startMinute + segment.endOffsetMinutes;
          if (
            !workingIntervals.some(
              (working) =>
                segmentStart >= working.startMinute &&
                segmentEnd <= working.endMinute,
            )
          ) {
            return false;
          }
          return !busyIntervals.some(
            (busy) =>
              segmentStart < busy.endMinute && segmentEnd > busy.startMinute,
          );
        });
      });
  }

  toTimeLabel(minute: number): string {
    const hours = Math.floor(minute / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (minute % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
