import assert from "node:assert/strict";
import test from "node:test";
import { buildBoardOperations, cardPayload, cloneBoard } from "../../lib/backend/board-operations.ts";
import type { BoardState } from "../../lib/board-types.ts";

const initial: BoardState = {
  zoom: 0.82,
  sections: [{ id: "section-a", name: "Fotografía", width: 620 }],
  cards: [
    {
      id: "card-a",
      sectionId: "section-a",
      type: "image",
      x: 10,
      y: 20,
      width: 300,
      height: 220,
      imagePath: "project/board/photo.jpg",
      imageUrl: "https://signed.example/photo.jpg",
      assetId: "asset-a",
    },
  ],
};

test("no genera operaciones cuando el tablero no cambió", () => {
  assert.deepEqual(buildBoardOperations(initial, cloneBoard(initial)), []);
});

test("genera un lote mínimo y ordenado para cambios mixtos", () => {
  const next = cloneBoard(initial);
  next.zoom = 1;
  next.sections[0].name = "Dirección de fotografía";
  next.sections.push({ id: "section-b", name: "Makeup", width: 720 });
  next.cards[0].x = 44;
  next.cards.push({
    id: "card-b",
    sectionId: "section-b",
    type: "note",
    x: 0,
    y: 0,
    width: 240,
    height: 160,
    title: "Piel",
    content: "Acabado natural",
  });

  const operations = buildBoardOperations(initial, next);
  assert.deepEqual(
    operations.map((operation) => operation.type),
    ["board.update", "section.update", "section.create", "item.update", "item.create"],
  );
});

test("elimina primero por identidad lógica y conserva referencias de asset", () => {
  const next = cloneBoard(initial);
  next.cards = [];
  const operations = buildBoardOperations(initial, next);
  assert.deepEqual(operations, [{ type: "item.delete", payload: { id: "card-a" } }]);
  assert.equal(cardPayload(initial.cards[0]).asset_id, "asset-a");
  assert.equal(cardPayload(initial.cards[0]).source_url, null);
});

test("omite la paleta ausente y conserva una paleta explícita", () => {
  const imagePayload = cardPayload(initial.cards[0]);
  assert.equal("colors" in imagePayload, false);

  const palettePayload = cardPayload({
    ...initial.cards[0],
    id: "card-palette",
    type: "palette",
    colors: ["#151515", "#f4efe6"],
  });
  assert.deepEqual(palettePayload.colors, ["#151515", "#f4efe6"]);
});

test("cloneBoard crea una copia profunda", () => {
  const copy = cloneBoard(initial);
  copy.sections[0].name = "Cambio local";
  assert.equal(initial.sections[0].name, "Fotografía");
});
