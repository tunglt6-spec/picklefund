import { parseIntake } from './zalo-intake.parser';
describe('structured Zalo finance commands', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-31T10:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());
  it('accepts bot mentions, VND grouping and Vietnamese fund labels', () => {
    expect(
      parseIntake('@Bot /chi 450.000 | Tiền sân | quỹ chính | 31/10/2026'),
    ).toEqual({
      kind: 'EXPENSE',
      payload: expect.objectContaining({
        amount: 450000,
        date: '2026-10-31',
        fundSource: 'COMMON',
      }),
    });
    expect(
      parseIntake('/thu 300000 | Tài trợ | quỹ phụ | 30/10/2026')?.payload
        .fundSource,
    ).toBe('MINI');
  });
  it.each(['0', '-1', '1,5', '450k', '1.50', '1e6', '1000000000001'])(
    'refuses ambiguous/invalid amount %s',
    (amount) =>
      expect(() =>
        parseIntake(`/chi ${amount} | Nước | quỹ chính | 31/10/2026`),
      ).toThrow(),
  );
  it.each(['31/02/2026', '32/10/2026', '2026-10-31', '01/11/2026'])(
    'rejects invalid/future date %s',
    (day) =>
      expect(() =>
        parseIntake(`/chi 5000 | Nước | quỹ chính | ${day}`),
      ).toThrow(),
  );
  it('does not interpret arbitrary chat, malformed fields, or unknown funds as financial instructions', () => {
    expect(parseIntake('Tôi vừa chuyển tiền')).toBeNull();
    expect(() =>
      parseIntake('/chi 5000 | Nước | quỹ khác | 31/10/2026'),
    ).toThrow();
    expect(() => parseIntake('/thu 5000 | Tên')).toThrow();
  });
});
