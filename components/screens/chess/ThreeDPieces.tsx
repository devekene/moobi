import Image from "next/image";
import { type JSX, useMemo } from "react";

type PieceMap = Record<string, () => JSX.Element>;
const PIECES = [
  "wP",
  "wN",
  "wB",
  "wR",
  "wQ",
  "wK",
  "bP",
  "bN",
  "bB",
  "bR",
  "bQ",
  "bK",
];

export function useThreeDPieces(scaleOverride?: number) {
  return useMemo(() => {
    const pieces: PieceMap = {};
    PIECES.forEach((piece) => {
      pieces[piece] = () => (
        <div
          style={{
            // Drag wrappers have auto dimensions; percentage sizing can collapse.
            // The board establishes an inline-size container with eight columns.
            width: scaleOverride === undefined ? "12.5cqw" : 40 * scaleOverride,
            height:
              scaleOverride === undefined ? "12.5cqw" : 40 * scaleOverride,
            position: "relative",
            pointerEvents: "none",
          }}
        >
          <Image
            alt=""
            src={`/chess/3d-pieces/${piece}.webp`}
            fill
            sizes="48px"
            style={{
              objectFit: "contain",
              objectPosition: "center bottom",
              transform:
                piece.endsWith("K") || piece.endsWith("Q")
                  ? "translateY(-8%) scale(1.18)"
                  : "translateY(-5%)",
            }}
          />
        </div>
      );
    });
    return pieces;
  }, [scaleOverride]);
}
