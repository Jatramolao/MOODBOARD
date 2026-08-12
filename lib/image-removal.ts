import type { BoardState, ImageRemovalScope } from "./board-types.ts";

export type ImageRemovalOutcome = {
  board: BoardState;
  assetId?: string;
  reference: "kept" | "deleted" | "retained-after-error";
  cause?: unknown;
};

export async function executeImageRemoval({
  board,
  cardId,
  scope,
  persistBoard,
  deleteAsset,
  onBoardSaved,
  onDeleting,
}: {
  board: BoardState;
  cardId: string;
  scope: ImageRemovalScope;
  persistBoard: (board: BoardState) => Promise<void>;
  deleteAsset: (assetId: string) => Promise<void>;
  onBoardSaved?: (board: BoardState) => void;
  onDeleting?: () => void;
}): Promise<ImageRemovalOutcome> {
  const card = board.cards.find((item) => item.id === cardId);
  if (!card || card.type !== "image") {
    return { board, reference: "kept" };
  }

  const next = {
    ...board,
    cards: board.cards.filter((item) => item.id !== cardId),
  };
  await persistBoard(next);
  onBoardSaved?.(next);

  if (scope === "board" || !card.assetId) {
    return { board: next, assetId: card.assetId, reference: "kept" };
  }

  onDeleting?.();
  try {
    await deleteAsset(card.assetId);
    return { board: next, assetId: card.assetId, reference: "deleted" };
  } catch (cause) {
    return {
      board: next,
      assetId: card.assetId,
      reference: "retained-after-error",
      cause,
    };
  }
}
