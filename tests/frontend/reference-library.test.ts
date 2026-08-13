import assert from "node:assert/strict";
import test from "node:test";
import { buildExistingAssetCard, formatAssetBytes, groupAssetUsages } from "../../lib/reference-library.ts";
import type { AssetUsage } from "../../lib/backend/types.ts";
import type { BoardState } from "../../lib/board-types.ts";

const board: BoardState = {
  zoom: 0.82,
  sections: [{ id: "section-1", name: "Fotografía", width: 620 }],
  cards: [],
};

test("muestra cero bytes sin inventar consumo en una biblioteca vacía", () => {
  assert.equal(formatAssetBytes(0), "0 KB");
  assert.equal(formatAssetBytes(1024), "1 KB");
  assert.equal(formatAssetBytes(1024 * 1024), "1.0 MB");
});

test("agrupa usos por activo sin mezclar tableros", () => {
  const usages: AssetUsage[] = [
    { assetId: "asset-1", boardId: "board-a", boardName: "A", itemId: "item-a", itemTitle: null, itemCreatedAt: "2026-08-12" },
    { assetId: "asset-1", boardId: "board-b", boardName: "B", itemId: "item-b", itemTitle: "Hero", itemCreatedAt: "2026-08-12" },
    { assetId: "asset-2", boardId: "board-a", boardName: "A", itemId: "item-c", itemTitle: null, itemCreatedAt: "2026-08-12" },
  ];

  const grouped = groupAssetUsages(usages);
  assert.equal(grouped.get("asset-1")?.length, 2);
  assert.equal(grouped.get("asset-2")?.[0].itemId, "item-c");
});

test("crea una tarjeta con el activo existente y su ruta privada exacta", () => {
  const card = buildExistingAssetCard(
    board,
    {
      assetId: "asset-1",
      imagePath: "project/origin/photo.webp",
      imageUrl: "https://signed.example/photo.webp",
      title: "photo.webp",
    },
    "item-new",
  );

  assert.deepEqual(
    { assetId: card.assetId, imagePath: card.imagePath, id: card.id, sectionId: card.sectionId },
    { assetId: "asset-1", imagePath: "project/origin/photo.webp", id: "item-new", sectionId: "section-1" },
  );
  assert.ok(card.x >= 0 && card.x + card.width <= 620);
});

test("rechaza la reinserción si el tablero no tiene una sección visible", () => {
  assert.throws(
    () => buildExistingAssetCard(
      { ...board, sections: [] },
      { assetId: "asset-1", imagePath: "path", imageUrl: "signed", title: "Imagen" },
      "item-new",
    ),
    /sección disponible/,
  );
});
