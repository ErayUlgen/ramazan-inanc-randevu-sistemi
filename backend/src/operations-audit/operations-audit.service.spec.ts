import { csvCell, csvRow } from './operations-audit.service';

describe('operations export CSV safety', () => {
  it.each(['=SUM(A1:A2)', '+cmd', '-10+20', '@formula'])(
    'neutralizes spreadsheet formulas: %s',
    (value) => {
      expect(csvCell(value)).toBe(`"'${value}"`);
    },
  );

  it('escapes quotes and keeps a CRLF row boundary', () => {
    expect(csvRow(['Ramazan "Hair Art"', 900])).toBe(
      '"Ramazan ""Hair Art""","900"\r\n',
    );
  });
});
