import assert from "node:assert/strict";
import test from "node:test";
import { removeCardsForAssets } from "../../lib/board-adapter.ts";
import type { BoardState } from "../../lib/board-types.ts";

const board: BoardState = {
  zoom: 0.82,
  sections: [{ id: "section-1", name: "Fotografía", width: 620 }],
  cards: [
    {
      id: "failed-card",
      sectionId: "section-1",
      type: "image",
      x: 72,
      y: 136,
      width: 220,
      height: 270,
      assetId: "failed-asset",
    },
    {
      id: "saved-card",
      sectionId: "section-1",
      type: "image",
      x: 322,
      y: 136,
      width: 220,
      height: 270,
      assetId: "saved-asset",
    },
  ],
};

test("retira sólo la tarjeta cuyo activo fue compensado", () => {
  const recovered = removeCardsForAssets(board, ["failed-asset"]);

  assert.deepEqual(recovered.cards.map((card) => card.id), ["saved-card"]);
  assert.equal(board.cards.length, 2);
});

test("la compensación repetida es idempotente", () => {
  const recovered = removeCardsForAssets(board, ["failed-asset"]);
  assert.equal(removeCardsForAssets(recovered, ["failed-asset"]), recovered);
});
