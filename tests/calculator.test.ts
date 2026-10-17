import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  calculate,
  restoreCalculator,
  calculatorKey,
  INITIAL_CALCULATOR,
  formatCalculation,
  groupCalculations,
  type Calculation,
} from "@/lib/calculator";
import { createCalculatorStore } from "@/stores/useCalculatorStore";
import Calculator from "@/components/screens/calculator";
import CalculatorHistory from "@/components/screens/calculator/CalculatorHistory";

describe("calculator", () => {
  it.each([
    ["4600−1800", "2800"],
    ["8×9", "72"],
    ["2500+2500+2100", "7100"],
    ["0.3×5000000", "1500000"],
    ["30÷100", "0.3"],
    ["14350−40000", "-25650"],
    ["2+3×4", "14"],
    ["(2+3)×4", "20"],
    ["50%×8", "4"],
    ["2^3^2", "512"],
    ["−2^2", "-4"],
    ["2^−2", "0.25"],
    ["√(81)", "9"],
    ["5!", "120"],
    ["sin(30)", "0.5"],
    ["asin(0.5)", "30"],
    ["ln(e)", "1"],
    ["log(100)", "2"],
    ["0.1+0.2", "0.3"],
    ["1e-7×10", "0.000001"],
  ])("evaluates %s", (expression, result) =>
    expect(calculate(expression)).toBe(result),
  );
  it("supports radians", () => expect(calculate("sin(π÷2)", false)).toBe("1"));
  it.each([
    "1÷0",
    "√(−1)",
    "2+",
    "(2",
    "171!",
    "tan(90)",
    "import(1)",
    "a=2",
    "2.3.4",
    "",
    "9".repeat(201),
  ])("rejects invalid or nonfinite %s", (expression) =>
    expect(() => calculate(expression)).toThrow(),
  );
  it("continues from results, starts fresh with digits, and recovers from errors", () => {
    const result = calculatorKey(
      { ...INITIAL_CALCULATOR, expression: "8×9" },
      "=",
    );
    expect(calculatorKey(result, "+").expression).toBe("72+");
    expect(calculatorKey(result, "3").expression).toBe("3");
    expect(calculatorKey(result, "=")).toBe(result);
    const error = calculatorKey(
      { ...INITIAL_CALCULATOR, expression: "1÷0" },
      "=",
    );
    expect(error.result).toBe("Error");
    expect(calculatorKey(error, "AC")).toEqual(INITIAL_CALCULATOR);
  });
  it("prevents extra decimal points and supports reversible signs", () => {
    let state = INITIAL_CALCULATOR;
    for (const key of [".", "5", "."]) state = calculatorKey(state, key);
    expect(state.expression).toBe("0.5");
    state = calculatorKey(state, "±");
    expect(calculate(state.expression)).toBe("-0.5");
    expect(calculatorKey(state, "±").expression).toBe("0.5");
    expect(calculatorKey({ ...state, expression: "8+" }, "×").expression).toBe(
      "8×",
    );
  });
  it("formats expressions without losing decimal input", () => {
    expect(formatCalculation("4600−1800")).toBe("4,600−1,800");
    expect(formatCalculation("1234.00")).toBe("1,234.00");
  });
  it("groups local dates across month and year boundaries, newest first", () => {
    const entry = (id: string, date: Date): Calculation => ({
      id,
      expression: "1+1",
      result: "2",
      createdAt: date.toISOString(),
    });
    const groups = groupCalculations(
      [
        entry("old", new Date(2025, 7, 1)),
        entry("month", new Date(2026, 7, 1)),
        entry("recent", new Date(2026, 9, 1)),
        entry("yesterday", new Date(2026, 9, 16)),
        entry("today", new Date(2026, 9, 17)),
      ],
      new Date(2026, 9, 17, 12),
    );
    expect(groups.map((group) => group.label)).toEqual([
      "Today",
      "Yesterday",
      "Previous 30 Days",
      "August",
      "August 2025",
    ]);
  });
  it("retains calculations and history through rehydration, recall and selected deletion", async () => {
    const records = new Map<string, string>();
    const storage = {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => {
        records.set(key, value);
      },
      removeItem: (key: string) => {
        records.delete(key);
      },
    };
    const store = createCalculatorStore(storage);
    for (const key of ["8", "×", "9", "=", "="]) store.getState().press(key);
    expect(store.getState().history).toHaveLength(1);
    const restored = createCalculatorStore(storage);
    await restored.persist.rehydrate();
    expect(restored.getState()).toMatchObject({
      expression: "8×9",
      result: "72",
      completed: true,
    });
    const entry = restored.getState().history[0];
    restored.getState().press("AC");
    restored.getState().recall(entry);
    restored.getState().press("+");
    expect(restored.getState().expression).toBe("72+");
    restored.getState().remove([entry.id]);
    expect(restored.getState().history).toEqual([]);
  });
  it("rejects malformed saved history and oversized input", () => {
    expect(
      restoreCalculator({
        expression: "1".repeat(201),
        history: [null, { result: "2" }],
        completed: true,
        result: "Infinity",
      }),
    ).toEqual({ ...INITIAL_CALCULATOR, history: [] });
  });
  it("renders accessible controls and a genuine empty history", () => {
    const board = renderToStaticMarkup(createElement(Calculator));
    expect(board).toContain('aria-label="All clear"');
    expect(board).toContain('aria-label="Delete last character"');
    expect(board).toContain('aria-label="Change sign"');
    const history = renderToStaticMarkup(
      createElement(CalculatorHistory, { onClose: () => {} }),
    );
    expect(history).toContain("No history yet");
    expect(history).toContain('aria-label="Close history"');
    expect(history).not.toContain("4,600");
  });
});
