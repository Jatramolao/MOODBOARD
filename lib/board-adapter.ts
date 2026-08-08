import type { BoardState } from "./board-types";

export type UploadedBoardAsset = {
  imageUrl: string;
  imagePath?: string;
  assetId?: string;
};

export type DiscardUploadedAssetsResult = {
  discardedAssetIds: string[];
  retainedAssetIds: string[];
  failedAssetIds: string[];
};

export function removeCardsForAssets(
  board: BoardState,
  assetIds: Iterable<string>,
): BoardState {
  const discarded = new Set(assetIds);
  if (!discarded.size) return board;
  const cards = board.cards.filter(
    (card) => !card.assetId || !discarded.has(card.assetId),
  );
  return cards.length === board.cards.length ? board : { ...board, cards };
}

export interface BoardAdapter {
  readonly kind: "supabase";
  load(): Promise<BoardState | null>;
  save(board: BoardState): Promise<void>;
  uploadImages(files: File[]): Promise<UploadedBoardAsset[]>;
  discardUploadedAssets(
    assets: UploadedBoardAsset[],
  ): Promise<DiscardUploadedAssetsResult>;
  subscribe(onRemoteChange: () => void): () => void;
}
