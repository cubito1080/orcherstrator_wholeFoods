/** Rounds a monetary value to two decimal places. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
