import type { BoardCard, BoardState } from "@/lib/board-types";

export type BoardOperation = {
  type:
    | "board.update"
    | "section.create"
    | "section.update"
    | "section.delete"
    | "item.create"
    | "item.update"
    | "item.delete";
  payload: Record<string, unknown>;
};

export const cloneBoard = (board: BoardState) =>
  JSON.parse(JSON.stringify(board)) as BoardState;

export function cardPayload(card: BoardCard) {
  return {
    id: card.id,
    section_id: card.sectionId,
    type: card.type,
    x: card.x,
    y: card.y,
    width: card.width,
    height: card.height,
    title: card.title ?? null,
    content: card.content ?? null,
    image_path: card.imagePath ?? null,
    source_url: card.imagePath ? null : card.imageUrl ?? null,
    ...(card.colors ? { colors: card.colors } : {}),
    asset_id: card.assetId ?? null,
  };
}

export function buildBoardOperations(
  previous: BoardState,
  next: BoardState,
): BoardOperation[] {
  const operations: BoardOperation[] = [];
  if (previous.zoom !== next.zoom) {
    operations.push({ type: "board.update", payload: { zoom: next.zoom } });
  }

  const previousSections = new Map(
    previous.sections.map((section, position) => [
      section.id,
      { ...section, position },
    ]),
  );
  const nextSections = new Map(
    next.sections.map((section, position) => [
      section.id,
      { ...section, position },
    ]),
  );

  nextSections.forEach((section, id) => {
    const before = previousSections.get(id);
    if (!before) {
      operations.push({ type: "section.create", payload: section });
    } else if (
      before.name !== section.name ||
      before.width !== section.width ||
      before.position !== section.position
    ) {
      operations.push({ type: "section.update", payload: section });
    }
  });
  previousSections.forEach((_, id) => {
    if (!nextSections.has(id)) {
      operations.push({ type: "section.delete", payload: { id } });
    }
  });

  const previousCards = new Map(previous.cards.map((card) => [card.id, card]));
  const nextCards = new Map(next.cards.map((card) => [card.id, card]));
  nextCards.forEach((card, id) => {
    const before = previousCards.get(id);
    const payload = cardPayload(card);
    if (!before) {
      operations.push({ type: "item.create", payload });
    } else if (JSON.stringify(cardPayload(before)) !== JSON.stringify(payload)) {
      operations.push({ type: "item.update", payload });
    }
  });
  previousCards.forEach((_, id) => {
    if (!nextCards.has(id)) {
      operations.push({ type: "item.delete", payload: { id } });
    }
  });
  return operations;
}
