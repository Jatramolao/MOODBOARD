import type { BoardState } from "./board-types";

export type UploadedBoardAsset = {
  imageUrl: string;
  imagePath?: string;
};

export interface BoardAdapter {
  readonly kind: "supabase";
  load(): Promise<BoardState | null>;
  save(board: BoardState): Promise<void>;
  uploadImages(files: File[]): Promise<UploadedBoardAsset[]>;
  subscribe(onRemoteChange: () => void): () => void;
}
