import React, { Dispatch, SetStateAction, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CgList } from "react-icons/cg";
import { BiCalculator, BiLeftArrow } from "react-icons/bi";
import { evaluate } from "mathjs";

const CalculatorBoard = ({
  history,
  setCalcScreen,
  setHistory,
}: {
  history:
    | {
        date: string;
        calculations: string[];
      }[]
    | null;
  setCalcScreen: Dispatch<SetStateAction<"board" | "history">>;
  setHistory: Dispatch<
    SetStateAction<
      | {
          date: string;
          calculations: string[];
        }[]
      | null
    >
  >;
}) => {
  const [calcValue, setCalcValue] = useState<string[]>([]);
  const [calcResult, setCalcResult] = useState("");
  const [showScientificKeys, setShowScientificKeys] = useState(false);
  const [showSecondScientificKeys, setShowSecondScientificKeys] =
    useState(false);

  const defaultCalcKeys = [
    "2nd",
    "deg",
    "xʸ",
    "log",
    "ln",
    "(",
    ")",
    "√",
    "AC",
    "undo",
    "%",
    "÷",
    "x!",
    "7",
    "8",
    "9",
    "×",
    "10ˣ",
    "4",
    "5",
    "6",
    "-",
    "π",
    "1",
    "2",
    "3",
    "+",
    "e",
    "toggle",
    "0",
    ".",
    "=",
  ];

  const minorCalcKeys = [
    ...defaultCalcKeys.slice(8, 12),
    ...defaultCalcKeys.slice(13, 17),
    ...defaultCalcKeys.slice(18, 22),
    ...defaultCalcKeys.slice(23, 27),
    ...defaultCalcKeys.slice(28),
  ];

  const scientificKeys = [
    ...defaultCalcKeys.slice(0, 2),
    ...(showSecondScientificKeys
      ? ["sin⁻¹", "cos⁻¹", "tan⁻¹"]
      : ["sin", "cos", "tan"]),
    ...defaultCalcKeys.slice(2),
  ];

  const calculatorKeys = showScientificKeys ? scientificKeys : minorCalcKeys;

  const handleKeyClick = (key: string) => {
    switch (key) {
      case "AC":
        setCalcValue([]);
        setCalcResult("");
        break;
      case "undo":
        setCalcValue((prev) => prev.slice(0, prev.length - 1));
        break;
      case "toggle":
        setShowScientificKeys(!showScientificKeys);
        break;
      case "2nd":
        setShowSecondScientificKeys(!showSecondScientificKeys);
        break;
      case "=":
        try {
          let expression = calcValue.join("");
          expression = expression.replace(/√\(/g, "sqrt(");
          const result = evaluate(expression);
          const roundedResult = Math.round(result * 1e6) / 1e6;
          setCalcResult(roundedResult.toString());

          const calcDate = new Date().toLocaleDateString();

          setHistory((prev) => {
            if (!prev) {
              return [
                {
                  date: calcDate,
                  calculations: [`${expression} = ${roundedResult}`],
                },
              ];
            }

            const dateIndex = prev.findIndex((item) => item.date === calcDate);

            if (dateIndex === -1) {
              return [
                {
                  date: calcDate,
                  calculations: [`${expression} = ${roundedResult}`],
                },
                ...prev,
              ];
            }

            const updated = [...prev];
            updated[dateIndex] = {
              ...updated[dateIndex],
              calculations: [
                ...updated[dateIndex].calculations,
                `${expression} = ${roundedResult}`,
              ],
            };
            return updated;
          });
        } catch {
          setCalcResult("Error");
        }
        break;
      case "√":
        setCalcValue((prev) => [...prev, "√("]);
        break;
      case "π":
        setCalcValue((prev) => [...prev, "3.14"]);
        break;
      case "x!":
        setCalcValue((prev) => [...prev, "!"]);
        break;
      case "xʸ":
        setCalcValue((prev) => [...prev, "^"]);
        break;
      case "10ˣ":
        setCalcValue((prev) => [...prev, "10^"]);
        break;
      case "log":
        setCalcValue((prev) => [...prev, "log("]);
        break;
      case "ln":
        setCalcValue((prev) => [...prev, "ln("]);
        break;
      case "sin":
      case "cos":
      case "tan":
        setCalcValue((prev) => [...prev, key, "("]);
        break;
      case "sin⁻¹":
        setCalcValue((prev) => [...prev, " asin("]);
        break;
      case "cos⁻¹":
        setCalcValue((prev) => [...prev, " acos("]);
        break;
      case "tan⁻¹":
        setCalcValue((prev) => [...prev, " atan("]);
        break;
      case "%":
        setCalcValue((prev) => [...prev, "%"]);
        break;
      case "÷":
        setCalcValue((prev) => [...prev, " / "]);
        break;
      case "×":
        setCalcValue((prev) => [...prev, " * "]);
        break;
      case "+":
        setCalcValue((prev) => [...prev, " + "]);
        break;
      case "-":
        setCalcValue((prev) => [...prev, " - "]);
        break;
      default:
        setCalcValue((prev) => [...prev, key]);
    }
  };

  return (
    <div className="px-8">
      <div
        className={cn(
          "flex h-[21%] w-full flex-col duration-500 ease-in-out",
          showScientificKeys && "h-[19%]",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 text-yellow-600"
          onClick={() => setCalcScreen("history")}
        >
          <CgList />
        </Button>

        <div className="flex flex-1 flex-col items-end justify-end gap-1.5">
          {calcResult && history && (
            <div className="text-base text-gray-500">
              {history[0].calculations[history[0].calculations.length - 1]}
            </div>
          )}

          <textarea
            value={calcValue.join("")}
            readOnly
            autoFocus
            className="no-visible-scrollbar h-9 max-w-full resize-none bg-transparent text-right text-3xl text-gray-300 focus:outline-none"
          />

          <div
            className={cn(
              "h-16 text-4xl text-white",
              showScientificKeys && "text-3xl",
            )}
          >
            {calcResult}
          </div>
        </div>
      </div>
      <div
        className={cn(
          "grid w-full grid-cols-4 gap-3 py-4 delay-75 duration-500 ease-in-out",
          showScientificKeys && "grid-cols-5 gap-2",
        )}
      >
        {calculatorKeys.map((key) => (
          <div
            key={key}
            onClick={() => handleKeyClick(key)}
            className={cn(
              "flex-center h-16 w-16 cursor-default rounded-full bg-neutral-600 text-base font-light text-white",
              showScientificKeys && "h-12 w-12 text-sm",
              (key === "-" ||
                key === "÷" ||
                key === "+" ||
                key === "=" ||
                key === "×") &&
                "bg-yellow-600 font-bold",
            )}
          >
            {key === "undo" ? (
              <BiLeftArrow />
            ) : key === "toggle" ? (
              <BiCalculator />
            ) : key !== "AC" ? (
              key
            ) : (
              ""
            )}

            {key === "AC" && (calcValue.length === 0 ? "AC" : "C")}
          </div>
        ))}
      </div>
    </div>
  );
};
export default CalculatorBoard;
