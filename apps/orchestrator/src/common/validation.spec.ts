import { BadRequestException } from "@nestjs/common";
import {
  optionalNumber,
  optionalString,
  parseBoundingBox,
  requireNonNegativeNumber,
  requireString,
} from "./validation";

describe("validation helpers", () => {
  describe("requireString", () => {
    it("trims and returns a present value", () => {
      expect(requireString("  hello  ", "field")).toBe("hello");
    });
    it("rejects empty or non-string values", () => {
      expect(() => requireString("   ", "name")).toThrow(BadRequestException);
      expect(() => requireString(undefined, "name")).toThrow(BadRequestException);
      expect(() => requireString(42, "name")).toThrow(BadRequestException);
    });
  });

  describe("requireNonNegativeNumber", () => {
    it("accepts zero and positive numbers", () => {
      expect(requireNonNegativeNumber(0, "price")).toBe(0);
      expect(requireNonNegativeNumber(12.5, "price")).toBe(12.5);
    });
    it("rejects negatives and non-numbers", () => {
      expect(() => requireNonNegativeNumber(-1, "price")).toThrow(BadRequestException);
      expect(() => requireNonNegativeNumber("3", "price")).toThrow(BadRequestException);
    });
  });

  describe("optional helpers", () => {
    it("pass through undefined", () => {
      expect(optionalString(undefined, "x")).toBeUndefined();
      expect(optionalNumber(undefined, "x")).toBeUndefined();
    });
    it("validate type when present", () => {
      expect(() => optionalNumber("nope", "x")).toThrow(BadRequestException);
    });
  });

  describe("parseBoundingBox", () => {
    it("parses a complete box", () => {
      expect(parseBoundingBox({ page: 0, x: 1, y: 2, width: 3, height: 4 })).toEqual({
        page: 0,
        x: 1,
        y: 2,
        width: 3,
        height: 4,
      });
    });
    it("returns undefined when omitted", () => {
      expect(parseBoundingBox(undefined)).toBeUndefined();
    });
    it("rejects malformed boxes", () => {
      expect(() => parseBoundingBox({ page: 0, x: "a", y: 2, width: 3, height: 4 })).toThrow(
        BadRequestException,
      );
    });
  });
});
