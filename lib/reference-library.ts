import type { AssetUsage } from "./backend/types";
import type { BoardCard, BoardState, ExistingBoardAsset } from "./board-types";

const CARD_WIDTH = 220;
const CARD_HEIGHT = 270;
const START_X = 72;
const START_Y = 136;
const GAP = 24;
const WORLD_HEIGHT = 1040;

export function groupAssetUsages(usages: AssetUsage[]) {
  const grouped = new Map<string, AssetUsage[]>();
  usages.forEach((usage) => {
    const current = grouped.get(usage.assetId);
    if (current) current.push(usage);
    else grouped.set(usage.assetId, [usage]);
  });
  return grouped;
}

export function buildExistingAssetCard(
  board: BoardState,
  asset: ExistingBoardAsset,
  cardId: string,
): BoardCard {
  const section = board.sections[0];
  if (!section) throw new Error("El tablero no tiene una sección disponible.");
  const cardsInSection = board.cards.filter((card) => card.sectionId === section.id);
  const columns = Math.max(1, Math.floor((section.width - START_X) / (CARD_WIDTH + GAP)));
  const slot = cardsInSection.length;
  const x = Math.min(
    START_X + (slot % columns) * (CARD_WIDTH + GAP),
    Math.max(0, section.width - CARD_WIDTH),
  );
  const y = Math.min(
    START_Y + Math.floor(slot / columns) * 48,
    WORLD_HEIGHT - CARD_HEIGHT,
  );
  return {
    id: cardId,
    sectionId: section.id,
    type: "image",
    x,
    y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    assetId: asset.assetId,
    imagePath: asset.imagePath,
    imageUrl: asset.imageUrl,
    title: asset.title,
  };
}
