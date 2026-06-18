import { roundMoney } from "./money";

describe("roundMoney", () => {
  it("rounds to two decimal places", () => {
    expect(roundMoney(1.005)).toBeCloseTo(1.0, 5);
    expect(roundMoney(2.345)).toBe(2.35);
    expect(roundMoney(100)).toBe(100);
    expect(roundMoney(0)).toBe(0);
  });

  it("handles quantity * unit price products", () => {
    expect(roundMoney(3 * 12.333)).toBe(37);
    expect(roundMoney(2 * 9.99)).toBe(19.98);
  });
});
