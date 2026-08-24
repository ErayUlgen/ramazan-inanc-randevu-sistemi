import {
  createActionToken,
  hashActionToken,
  openActionToken,
  sealActionToken,
} from './action-token';

describe('public action tokens', () => {
  it('creates unpredictable tokens and persists only an irreversible hash', () => {
    const first = createActionToken();
    const second = createActionToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(hashActionToken(first)).not.toContain(first);
  });

  it('round-trips an encrypted outbox envelope and rejects tampering', () => {
    const token = createActionToken();
    const envelope = sealActionToken(token);

    expect(envelope).not.toContain(token);
    expect(openActionToken(envelope)).toBe(token);
    expect(openActionToken(`${envelope}broken`)).toBeNull();
  });
});
