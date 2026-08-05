import assert from "node:assert/strict";
import test from "node:test";
import {
  clampCardPosition,
  clampCardSize,
  resizeCardFromPointer,
  resolveSectionAtX,
} from "../../lib/board-geometry.ts";

test("aplica los mismos límites de tamaño al previsualizar y persistir", () => {
  assert.deepEqual(clampCardSize(40, 900), { width: 150, height: 620 });
  assert.deepEqual(
    resizeCardFromPointer({
      startWidth: 220,
      startHeight: 270,
      deltaX: -400,
      deltaY: 700,
    }),
    { width: 150, height: 620 },
  );
});

test("reduce imágenes conservando su proporción y respetando el mínimo", () => {
  const resized = resizeCardFromPointer({
    startWidth: 220,
    startHeight: 270,
    deltaX: -500,
    deltaY: -500,
    lockAspectRatio: true,
  });

  assert.deepEqual(resized, { width: 150, height: 184.09 });
  assert.ok(Math.abs(resized.width / resized.height - 220 / 270) < 0.001);
});

test("permite ajustes pequeños de imagen mediante teclado sin deformarla", () => {
  const resized = resizeCardFromPointer({
    startWidth: 220,
    startHeight: 270,
    deltaX: -40,
    deltaY: 0,
    lockAspectRatio: true,
  });

  assert.ok(resized.width < 220);
  assert.ok(resized.height < 270);
  assert.ok(Math.abs(resized.width / resized.height - 220 / 270) < 0.001);
});

test("mantiene una tarjeta dentro de su sección al moverla o agrandarla", () => {
  assert.deepEqual(
    clampCardPosition({
      x: 900,
      y: 980,
      width: 220,
      height: 270,
      sectionWidth: 700,
      worldHeight: 1040,
    }),
    { x: 462, y: 744 },
  );
});

test("un arrastre más allá del lienzo termina en la última sección", () => {
  const sections = [
    { id: "one", width: 420 },
    { id: "two", width: 500 },
  ];

  assert.deepEqual(resolveSectionAtX(sections, 4_000, 28), {
    section: sections[1],
    offset: 448,
  });
});
