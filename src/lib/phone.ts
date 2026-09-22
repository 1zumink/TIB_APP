/**
 * Russian phone mask: +7 (916) 611-47-35
 *
 * The card prints the number in this exact shape, so the field types it that
 * way from the first digit instead of asking anyone to punch in brackets.
 */

const MAX_DIGITS = 11; // country code + 10

/** Everything the user actually typed, country code normalised to 7. */
export function phoneDigits(input: string): string {
  let d = input.replace(/\D/g, '');
  if (!d) return '';
  // 8 916… and 7 916… are the same number; a bare 9 means they skipped the code.
  if (d[0] === '8') d = '7' + d.slice(1);
  else if (d[0] !== '7') d = '7' + d;
  return d.slice(0, MAX_DIGITS);
}

/** Digits → display string, filled in as far as the digits go. */
export function formatPhone(input: string): string {
  const d = phoneDigits(input);
  if (!d) return '';
  const a = d.slice(1, 4);
  const b = d.slice(4, 7);
  const c = d.slice(7, 9);
  const e = d.slice(9, 11);
  let out = '+7';
  if (a) out += ` (${a}`;
  if (a.length === 3) out += ')';
  if (b) out += ` ${b}`;
  if (c) out += `-${c}`;
  if (e) out += `-${e}`;
  return out;
}

/**
 * What the field should show after an edit.
 *
 * Deleting needs its own branch: backspacing over a separator would otherwise
 * leave the digit behind it untouched, the mask would put the separator back,
 * and the caret would sit there refusing to move. So when the edit got shorter
 * without losing a digit, drop a digit instead.
 */
export function nextPhoneValue(previous: string, edited: string): string {
  const before = phoneDigits(previous);
  const after = phoneDigits(edited);
  const deleting = edited.length < previous.length;
  if (deleting && after === before) return formatPhone(before.slice(0, -1));
  // Clearing the field entirely should leave it empty, not snap back to "+7".
  if (!edited.replace(/\D/g, '')) return '';
  return formatPhone(edited);
}
