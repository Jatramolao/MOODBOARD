import assert from "node:assert/strict";
import test from "node:test";
import { executeImageRemoval } from "../../lib/image-removal.ts";
import type { BoardState } from "../../lib/board-types.ts";

const board: BoardState = {
  zoom: 0.82,
  sections: [{ id: "section-1", name: "Fotografía", width: 620 }],
  cards: [
    {
      id: "image-1",
      sectionId: "section-1",
      type: "image",
      x: 72,
      y: 136,
      width: 220,
      height: 270,
      assetId: "asset-1",
      imagePath: "project/board/image.jpg",
    },
  ],
};

test("retirar sólo persiste item.delete y conserva la referencia", async () => {
  const calls: string[] = [];
  const outcome = await executeImageRemoval({
    board,
    cardId: "image-1",
    scope: "board",
    persistBoard: async (next) => {
      calls.push("save");
      assert.equal(next.cards.length, 0);
    },
    deleteAsset: async () => { calls.push("delete"); },
  });

  assert.deepEqual(calls, ["save"]);
  assert.equal(outcome.reference, "kept");
  assert.equal(outcome.board.cards.length, 0);
});

test("la eliminación completa borra el activo sólo después del guardado", async () => {
  const calls: string[] = [];
  const outcome = await executeImageRemoval({
    board,
    cardId: "image-1",
    scope: "board-and-references",
    persistBoard: async () => { calls.push("save"); },
    onBoardSaved: () => calls.push("confirmed"),
    onDeleting: () => calls.push("deleting"),
    deleteAsset: async () => { calls.push("delete"); },
  });

  assert.deepEqual(calls, ["save", "confirmed", "deleting", "delete"]);
  assert.equal(outcome.reference, "deleted");
});

test("un fallo de guardado no llama mark_asset_deleted", async () => {
  let deleteCalls = 0;
  await assert.rejects(
    executeImageRemoval({
      board,
      cardId: "image-1",
      scope: "board-and-references",
      persistBoard: async () => { throw new Error("VERSION_CONFLICT:2"); },
      deleteAsset: async () => { deleteCalls += 1; },
    }),
    /VERSION_CONFLICT/,
  );
  assert.equal(deleteCalls, 0);
  assert.equal(board.cards.length, 1);
});

test("ASSET_IN_USE deja la tarjeta retirada y la referencia recuperable", async () => {
  const cause = { code: "ASSET_IN_USE", message: "ASSET_IN_USE" };
  const outcome = await executeImageRemoval({
    board,
    cardId: "image-1",
    scope: "board-and-references",
    persistBoard: async () => undefined,
    deleteAsset: async () => { throw cause; },
  });

  assert.equal(outcome.reference, "retained-after-error");
  assert.equal(outcome.cause, cause);
  assert.equal(outcome.board.cards.length, 0);
});

test("un reintento sobre una tarjeta ya retirada no duplica operaciones", async () => {
  let saveCalls = 0;
  let deleteCalls = 0;
  const outcome = await executeImageRemoval({
    board: { ...board, cards: [] },
    cardId: "image-1",
    scope: "board-and-references",
    persistBoard: async () => { saveCalls += 1; },
    deleteAsset: async () => { deleteCalls += 1; },
  });

  assert.equal(outcome.reference, "kept");
  assert.equal(saveCalls, 0);
  assert.equal(deleteCalls, 0);
});
