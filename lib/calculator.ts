export type Calculation = {
  id: string;
  expression: string;
  result: string;
  createdAt: string;
};
export type CalculatorState = {
  expression: string;
  result: string;
  completed: boolean;
  degrees: boolean;
};
export const INITIAL_CALCULATOR: CalculatorState = {
  expression: "",
  result: "",
  completed: false,
  degrees: true,
};

export function calculate(expression: string, degrees = true): string {
  if (!expression || expression.length > 200)
    throw new Error("Invalid expression");
  // Accept only the calculator's numeric grammar; no assignments, objects or arbitrary functions.
  const tokens =
    expression.match(
      /asin|acos|atan|sin|cos|tan|log|ln|π|e|√|\d+(?:\.\d*)?(?:e[+-]?\d+)?|\.\d+|[+−×÷^!()%.-]/g,
    ) ?? [];
  if (!tokens.length || tokens.join("") !== expression)
    throw new Error("Invalid expression");
  // Small numeric parser keeps the persisted store lightweight at shell startup.
  let position = 0;
  const peek = () => tokens[position];
  function primary(): number {
    const token = tokens[position++];
    let value: number;
    if (token === "(") {
      value = sum();
      if (tokens[position++] !== ")") throw new Error("Missing parenthesis");
    } else if (token === "π") value = Math.PI;
    else if (token === "e") value = Math.E;
    else if (token && /^(?:asin|acos|atan|sin|cos|tan|ln|log|√)$/.test(token)) {
      if (tokens[position++] !== "(") throw new Error("Missing parenthesis");
      const argument = sum();
      if (tokens[position++] !== ")") throw new Error("Missing parenthesis");
      const radians = degrees ? (argument * Math.PI) / 180 : argument;
      const inverseFactor = degrees ? 180 / Math.PI : 1;
      switch (token) {
        case "sin":
          value = Math.sin(radians);
          break;
        case "cos":
          value = Math.cos(radians);
          break;
        case "tan":
          value = Math.abs(Math.cos(radians)) < 1e-14 ? NaN : Math.tan(radians);
          break;
        case "asin":
          value = Math.asin(argument) * inverseFactor;
          break;
        case "acos":
          value = Math.acos(argument) * inverseFactor;
          break;
        case "atan":
          value = Math.atan(argument) * inverseFactor;
          break;
        case "log":
          value = Math.log10(argument);
          break;
        case "ln":
          value = Math.log(argument);
          break;
        default:
          value = Math.sqrt(argument);
      }
    } else {
      if (!token || !/^(?:\d+(?:\.\d*)?(?:e[+-]?\d+)?|\.\d+)$/.test(token))
        throw new Error("Expected number");
      value = Number(token);
    }
    while (peek() === "%" || peek() === "!") {
      if (tokens[position++] === "%") value /= 100;
      else {
        if (!Number.isInteger(value) || value < 0 || value > 170)
          throw new Error("Invalid factorial");
        let factorial = 1;
        for (let i = 2; i <= value; i++) factorial *= i;
        value = factorial;
      }
    }
    return value;
  }
  function power(): number {
    const value = primary();
    if (peek() !== "^") return value;
    position++;
    return value ** unary();
  }
  function unary(): number {
    if (peek() === "−" || peek() === "-" || peek() === "+") {
      const token = tokens[position++];
      return (token === "+" ? 1 : -1) * unary();
    }
    return power();
  }
  function product(): number {
    let value = unary();
    while (peek() === "×" || peek() === "÷") {
      const token = tokens[position++];
      const right = unary();
      value = token === "×" ? value * right : value / right;
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (peek() === "+" || peek() === "−" || peek() === "-") {
      const token = tokens[position++];
      const right = product();
      value = token === "+" ? value + right : value - right;
    }
    return value;
  }
  const value = sum();
  if (position !== tokens.length || !Number.isFinite(value))
    throw new Error("Invalid result");
  return Number(value.toPrecision(12)).toString();
}

export function calculatorKey(
  state: CalculatorState,
  key: string,
): CalculatorState {
  if (key === "AC") return { ...INITIAL_CALCULATOR, degrees: state.degrees };
  if (key === "angle") return { ...state, degrees: !state.degrees };
  if (key === "=") {
    if (!state.expression || state.completed) return state;
    try {
      return {
        ...state,
        result: calculate(state.expression, state.degrees),
        completed: true,
      };
    } catch {
      return { ...state, result: "Error", completed: false };
    }
  }
  if (key === "backspace") {
    return {
      ...state,
      expression: state.expression.slice(0, -1),
      result: "",
      completed: false,
    };
  }
  const operator = /^[+−×÷^]$/.test(key);
  let expression = state.completed
    ? operator || key === "%" || key === "±"
      ? state.result
      : ""
    : state.expression;
  if (key === "±") {
    const negative = expression.match(/\(−(\d*\.?\d+(?:e[+-]?\d+)?|π|e)\)$/);
    const match = expression.match(/(\d*\.?\d+(?:e[+-]?\d+)?|π|e)$/);
    if (negative)
      expression = expression.slice(0, -negative[0].length) + negative[1];
    else if (match) {
      const start = expression.slice(0, -match[0].length);
      expression =
        start === "−" || start === "-"
          ? match[0]
          : start + "(−" + match[0] + ")";
    } else return state;
  } else if (key === ".") {
    if (/\d*\.\d*$/.test(expression)) return state;
    expression += /\d$/.test(expression) ? "." : "0.";
  } else if (operator && /[+−×÷^]$/.test(expression)) {
    expression = expression.slice(0, -1) + key;
  } else {
    if (operator && !expression && key !== "−") return state;
    expression += key;
  }
  if (expression.length > 200) return state;
  return { ...state, expression, result: "", completed: false };
}

export function formatCalculation(value: string): string {
  return value.replace(/\d+(?:\.\d*)?(?:e[+-]?\d+)?/g, (number) => {
    if (number.includes("e")) return number;
    const [whole, fraction] = number.split(".");
    return (
      Number(whole).toLocaleString("en-US") +
      (fraction !== undefined ? "." + fraction : "")
    );
  });
}

export function groupCalculations(history: Calculation[], now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() - 30);
  const groups = new Map<string, Calculation[]>();
  for (const entry of [...history].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )) {
    const date = new Date(entry.createdAt);
    const label =
      date >= today
        ? "Today"
        : date >= yesterday
          ? "Yesterday"
          : date >= thirtyDays
            ? "Previous 30 Days"
            : date.toLocaleDateString("en-US", {
                month: "long",
                ...(date.getFullYear() !== now.getFullYear()
                  ? { year: "numeric" }
                  : {}),
              });
    groups.set(label, [...(groups.get(label) ?? []), entry]);
  }
  return [...groups].map(([label, entries]) => ({ label, entries }));
}

export function restoreCalculator(
  saved: unknown,
): CalculatorState & { history: Calculation[] } {
  const fallback = { ...INITIAL_CALCULATOR, history: [] };
  if (!saved || typeof saved !== "object") return fallback;
  const expression =
    "expression" in saved &&
    typeof saved.expression === "string" &&
    saved.expression.length <= 200
      ? saved.expression
      : "";
  const result =
    "result" in saved &&
    typeof saved.result === "string" &&
    saved.result.length <= 40 &&
    (saved.result === "" ||
      saved.result === "Error" ||
      Number.isFinite(Number(saved.result)))
      ? saved.result
      : "";
  const history =
    "history" in saved && Array.isArray(saved.history)
      ? saved.history
          .filter((entry: unknown): entry is Calculation => {
            if (!entry || typeof entry !== "object") return false;
            return (
              "id" in entry &&
              typeof entry.id === "string" &&
              "expression" in entry &&
              typeof entry.expression === "string" &&
              entry.expression.length <= 200 &&
              "result" in entry &&
              typeof entry.result === "string" &&
              entry.result.length <= 40 &&
              entry.result !== "" &&
              Number.isFinite(Number(entry.result)) &&
              "createdAt" in entry &&
              typeof entry.createdAt === "string" &&
              Number.isFinite(Date.parse(entry.createdAt))
            );
          })
          .slice(0, 500)
      : [];
  return {
    expression,
    result,
    completed:
      "completed" in saved &&
      saved.completed === true &&
      result !== "" &&
      result !== "Error",
    degrees: !("degrees" in saved && saved.degrees === false),
    history,
  };
}
