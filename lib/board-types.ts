export type BoardCardType = "image" | "note" | "palette";

export type BoardSection = {
  id: string;
  name: string;
  width: number;
};

export type BoardCard = {
  id: string;
  sectionId: string;
  type: BoardCardType;
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl?: string;
  imagePath?: string;
  assetId?: string;
  title?: string;
  content?: string;
  colors?: string[];
};

export type BoardState = {
  sections: BoardSection[];
  cards: BoardCard[];
  zoom: number;
};

export type BoardActions = {
  addSection: (name: string) => void;
  addNote: () => void;
  addImages: (files: FileList | File[]) => Promise<void>;
  moveCard: (
    cardId: string,
    globalX: number,
    y: number,
  ) => void;
  resizeCard: (cardId: string, width: number, height: number) => void;
  removeCard: (cardId: string) => void;
  updateCardText: (cardId: string, title: string, content: string) => void;
  setZoom: (zoom: number) => void;
  resetBoard: () => void;
};

export type BoardMeta = {
  hydrated: boolean;
  syncStatus: "local" | "loading" | "saving" | "saved" | "offline" | "error";
  syncError?: string;
  canEdit: boolean;
  versionConflict: boolean;
  worldWidth: number;
  sectionOffsets: Map<string, number>;
};
