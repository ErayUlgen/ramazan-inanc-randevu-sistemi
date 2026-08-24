import { validate } from 'class-validator';
import { CreateHoldDto } from './create-hold.dto';

const createDto = (serviceIds: string[]) =>
  Object.assign(new CreateHoldDto(), {
    branchSlug: 'hair-art-ramazan-inanc-denizli',
    serviceIds,
    date: '2026-07-24',
    startTime: '10:00',
  });

describe('CreateHoldDto', () => {
  it('tek hizmetli online randevuya izin verir', async () => {
    const errors = await validate(
      createDto(['d7029128-35ad-4fe7-923d-413d9a65330a']),
    );

    expect(errors).toHaveLength(0);
  });

  it('birden fazla hizmeti müşteri randevusu sınırında reddeder', async () => {
    const errors = await validate(
      createDto([
        'd7029128-35ad-4fe7-923d-413d9a65330a',
        '093526df-4b13-4cfa-9d07-0b925a764a9d',
      ]),
    );

    expect(errors[0]?.constraints?.arrayMaxSize).toBe(
      'Online randevuda yalnızca bir hizmet seçilebilir.',
    );
  });
});
