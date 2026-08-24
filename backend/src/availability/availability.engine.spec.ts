import { AvailabilityEngine } from './availability.engine';

describe('AvailabilityEngine', () => {
  const engine = new AvailabilityEngine();

  it('boş günde saat başlarını üretir', () => {
    expect(engine.buildCandidateStarts(600, 1260, 60, [])).toEqual([
      600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200,
    ]);
  });

  it('45 dakikalık randevunun bitişini yeni başlangıç yapar', () => {
    expect(
      engine.buildCandidateStarts(600, 1260, 15, [
        { startMinute: 600, endMinute: 645 },
      ]),
    ).toContain(645);
  });

  it('10:45 ile 11:00 arasına bir saatlik hizmet sığdırmaz', () => {
    const result = engine.buildCandidateStarts(600, 1260, 60, [
      { startMinute: 600, endMinute: 645 },
      { startMinute: 660, endMinute: 720 },
    ]);
    expect(result).not.toContain(645);
    expect(result).toContain(720);
  });

  it('yarı açık aralık sayesinde bitiş anında yeni randevuya izin verir', () => {
    expect(
      engine.buildCandidateStarts(600, 1260, 60, [
        { startMinute: 600, endMinute: 660 },
      ]),
    ).toContain(660);
  });

  it('öğle arasına taşan hizmeti üretmez ve ikinci vardiyada yeniden başlar', () => {
    const result = engine.buildCandidateStartsForIntervals(
      [
        { startMinute: 600, endMinute: 780 },
        { startMinute: 840, endMinute: 1260 },
      ],
      60,
      [],
      15,
    );

    expect(result).not.toContain(750);
    expect(result).toContain(840);
  });

  it('uzman ve şube bloklarının bitişini akıllı başlangıç olarak değerlendirir', () => {
    const result = engine.buildCandidateStartsForIntervals(
      [{ startMinute: 600, endMinute: 900 }],
      30,
      [
        { startMinute: 600, endMinute: 635 },
        { startMinute: 700, endMinute: 745 },
      ],
      60,
    );

    expect(result).toContain(635);
    expect(result).toContain(745);
  });

  it('geçmişe düşen başlangıçları minimum dakika sınırıyla eler', () => {
    expect(
      engine.buildCandidateStartsForIntervals(
        [{ startMinute: 600, endMinute: 780 }],
        30,
        [],
        15,
        691,
      ),
    ).toEqual([705, 720, 735, 750]);
  });

  it('bitiş sınırını aşan son slotu üretmez', () => {
    expect(
      engine.buildCandidateStartsForIntervals(
        [{ startMinute: 600, endMinute: 645 }],
        30,
        [],
        15,
      ),
    ).toEqual([600, 615]);
  });
});
