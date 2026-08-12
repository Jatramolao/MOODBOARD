"use client";

import {
  createContext,
  startTransition,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  removeCardsForAssets,
  type BoardAdapter,
  type UploadedBoardAsset,
} from "@/lib/board-adapter";
import { cloneDefaultBoard } from "@/lib/board-data";
import {
  clampCardPosition,
  clampCardSize,
  resolveSectionAtX,
} from "@/lib/board-geometry";
import type {
  BoardActions,
  BoardCard,
  BoardMeta,
  BoardState,
} from "@/lib/board-types";
import { frontendErrorMessage, readBackendError } from "@/lib/frontend-errors";
import { executeImageRemoval } from "@/lib/image-removal";

const STORAGE_KEY = "moodboard.workspace.v1";
const MIN_SECTION_WIDTH = 420;
const SECTION_GAP = 28;
const WORLD_HEIGHT = 1040;

type BoardContextValue = {
  state: BoardState;
  actions: BoardActions;
  meta: BoardMeta;
};

const BoardContext = createContext<BoardContextValue | null>(null);

function safeReadBoard(): BoardState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version: number; board: BoardState };
    return parsed.version === 1 ? parsed.board : null;
  } catch {
    return null;
  }
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function BoardProvider({
  adapter,
  readOnly = false,
  children,
}: {
  adapter?: BoardAdapter | null;
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<BoardState>(cloneDefaultBoard);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] =
    useState<BoardMeta["syncStatus"]>("loading");
  const [syncError, setSyncError] = useState<string>();
  const [versionConflict, setVersionConflict] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(true);
  const suppressNextSave = useRef(false);
  const lastLocalSave = useRef(0);
  const pendingUploads = useRef(new Map<string, UploadedBoardAsset>());
  const removalsInFlight = useRef(new Set<string>());

  useEffect(() => {
    const updateNetworkState = () => {
      const online = navigator.onLine;
      setNetworkOnline(online);
      if (adapter && !online) {
        setSyncStatus("offline");
        setSyncError(
          "No hay conexión. Los cambios permanecen en esta sesión y se guardarán al volver a estar en línea.",
        );
      }
    };
    updateNetworkState();
    window.addEventListener("online", updateNetworkState);
    window.addEventListener("offline", updateNetworkState);
    return () => {
      window.removeEventListener("online", updateNetworkState);
      window.removeEventListener("offline", updateNetworkState);
    };
  }, [adapter]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    let remoteRefreshTimer: number | undefined;

    const hydrate = async () => {
      if (!adapter) {
        const saved = safeReadBoard();
        if (saved && mounted) setState(saved);
        if (mounted) {
          setHydrated(true);
          setSyncStatus("local");
        }
        return;
      }

      try {
        const remote = await adapter.load();
        if (!mounted) return;
        if (remote) setState(remote);
        setSyncStatus("saved");
        setHydrated(true);

        const refreshRemote = async () => {
          try {
            const updated = await adapter.load();
            if (!mounted || !updated) return;
            suppressNextSave.current = true;
            setState(updated);
            setSyncStatus("saved");
          } catch (error) {
            if (!mounted) return;
            setSyncStatus("error");
            setSyncError(
              error instanceof Error ? error.message : "No se pudo sincronizar.",
            );
          }
        };

        unsubscribe = adapter.subscribe(() => {
          if (remoteRefreshTimer) window.clearTimeout(remoteRefreshTimer);
          const elapsed = Date.now() - lastLocalSave.current;
          const delay = Math.max(0, 1_500 - elapsed);
          remoteRefreshTimer = window.setTimeout(
            () => void refreshRemote(),
            delay,
          );
        });
      } catch (error) {
        if (!mounted) return;
        setHydrated(true);
        setSyncStatus("error");
        setSyncError(
          error instanceof Error ? error.message : "No se pudo abrir el tablero.",
        );
      }
    };

    void hydrate();
    return () => {
      mounted = false;
      if (remoteRefreshTimer) window.clearTimeout(remoteRefreshTimer);
      unsubscribe?.();
    };
  }, [adapter]);

  useEffect(() => {
    if (!hydrated) return;
    if (suppressNextSave.current) {
      suppressNextSave.current = false;
      return;
    }
    if (adapter && !networkOnline) {
      return;
    }

    const persist = async () => {
      try {
        if (adapter) {
          setSyncStatus("saving");
          lastLocalSave.current = Date.now();
          await adapter.save(state);
          const savedCardIds = new Set(state.cards.map((card) => card.id));
          pendingUploads.current.forEach((_, cardId) => {
            if (savedCardIds.has(cardId)) pendingUploads.current.delete(cardId);
          });
          setSyncStatus("saved");
          setSyncError(undefined);
        } else {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ version: 1, board: state }),
          );
          setSyncStatus("local");
        }
      } catch (error) {
        const mapped = readBackendError(error);
        const pending = [...pendingUploads.current.entries()].filter(([cardId]) =>
          state.cards.some((card) => card.id === cardId),
        );
        let cleanupFailed = false;
        if (adapter && pending.length) {
          let cleanup;
          try {
            cleanup = await adapter.discardUploadedAssets(
              pending.map(([, asset]) => asset),
            );
          } catch {
            cleanup = {
              discardedAssetIds: [],
              retainedAssetIds: [],
              failedAssetIds: pending.flatMap(([, asset]) =>
                asset.assetId ? [asset.assetId] : [],
              ),
            };
          }
          const retained = new Set(cleanup.retainedAssetIds);
          const removable = new Set([
            ...cleanup.discardedAssetIds,
            ...cleanup.failedAssetIds,
          ]);
          cleanupFailed = cleanup.failedAssetIds.length > 0;
          pending.forEach(([cardId, asset]) => {
            if (!asset.assetId || !retained.has(asset.assetId)) {
              pendingUploads.current.delete(cardId);
            }
          });
          if (removable.size) {
            setState((current) => removeCardsForAssets(current, removable));
          }
          if (retained.size) {
            try {
              const remote = await adapter.load();
              if (remote) {
                suppressNextSave.current = true;
                setState(remote);
                pending.forEach(([cardId]) => pendingUploads.current.delete(cardId));
                setSyncStatus("saved");
                setSyncError(undefined);
                return;
              }
            } catch {
              cleanupFailed = true;
            }
          }
        }
        setSyncStatus("error");
        const message = frontendErrorMessage(error, "No se pudo guardar.");
        setSyncError(cleanupFailed
          ? `${message} La tarjeta local se retiró, pero la limpieza del activo requiere reintento.`
          : pending.length
            ? `${message} La carga incompleta se retiró del tablero y de Referencias.`
            : message);
        if (mapped.code === "VERSION_CONFLICT") {
          setVersionConflict(true);
        }
      }
    };

    const id = window.setTimeout(() => void persist(), adapter ? 520 : 180);
    return () => window.clearTimeout(id);
  }, [adapter, hydrated, networkOnline, state]);

  const sectionOffsets = useMemo(() => {
    const offsets = new Map<string, number>();
    let cursor = 0;
    state.sections.forEach((section) => {
      offsets.set(section.id, cursor);
      cursor += section.width + SECTION_GAP;
    });
    return offsets;
  }, [state.sections]);

  const worldWidth = useMemo(
    () =>
      state.sections.reduce(
        (total, section) => total + section.width + SECTION_GAP,
        0,
      ) + 120,
    [state.sections],
  );

  const addSection = useCallback((rawName: string) => {
    if (readOnly || versionConflict) return;
    const name = rawName.trim();
    if (!name) return;
    setState((current) => ({
      ...current,
      sections: [
        ...current.sections,
        {
          id: crypto.randomUUID(),
          name,
          width: MIN_SECTION_WIDTH,
        },
      ],
    }));
  }, [readOnly, versionConflict]);

  const addNote = useCallback(() => {
    if (readOnly || versionConflict) return;
    setState((current) => {
      const section = current.sections[0];
      const notes = current.cards.filter(
        (card) => card.sectionId === section.id && card.type === "note",
      ).length;
      const card: BoardCard = {
        id: crypto.randomUUID(),
        sectionId: section.id,
        type: "note",
        x: 84 + notes * 26,
        y: 140 + notes * 24,
        width: 240,
        height: 184,
        title: "Nueva nota",
        content: "Escribe aquí una observación para el equipo.",
      };
      return { ...current, cards: [...current.cards, card] };
    });
  }, [readOnly, versionConflict]);

  const addImages = useCallback(async (files: FileList | File[]) => {
    if (readOnly || versionConflict) return;
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ]);
    const accepted = Array.from(files)
      .filter(
        (file) =>
          allowedTypes.has(file.type) && file.size <= 50 * 1024 * 1024,
      )
      .slice(0, 8);
    if (!accepted.length) {
      setSyncStatus("error");
      setSyncError(
        "Usa JPG, PNG, WebP, GIF o AVIF de hasta 50 MB por imagen.",
      );
      return;
    }

    let assets: UploadedBoardAsset[];
    try {
      if (adapter) setSyncStatus("saving");
      assets = adapter
        ? await adapter.uploadImages(accepted)
        : await Promise.all(accepted.map(readFile)).then((urls) =>
            urls.map((imageUrl) => ({ imageUrl })),
          );
    } catch (error) {
      setSyncStatus("error");
      setSyncError(frontendErrorMessage(error, "No se pudo subir la imagen."));
      return;
    }

    const pending = assets.map((asset, index) => ({
      asset,
      cardId: crypto.randomUUID(),
      title: accepted[index].name.replace(/\.[^.]+$/, ""),
    }));
    if (adapter) {
      pending.forEach(({ asset, cardId }) => {
        pendingUploads.current.set(cardId, asset);
      });
    }

    startTransition(() => {
      setState((current) => {
        const section = current.sections[0];
        const additions = pending.map<BoardCard>(({ asset, cardId, title }, index) => ({
          id: cardId,
          sectionId: section.id,
          type: "image",
          x: 72 + ((current.cards.length + index) % 3) * 250,
          y: 136 + ((current.cards.length + index) % 4) * 180,
          width: 220,
          height: 270,
          imageUrl: asset.imageUrl,
          imagePath: asset.imagePath,
          assetId: asset.assetId,
          title,
        }));
        return { ...current, cards: [...current.cards, ...additions] };
      });
    });
  }, [adapter, readOnly, versionConflict]);

  const moveCard = useCallback(
    (cardId: string, globalX: number, y: number) => {
      if (readOnly || versionConflict) return;
      setState((current) => {
        const target = resolveSectionAtX(
          current.sections,
          globalX,
          SECTION_GAP,
        );
        if (!target) return current;
        const { section: targetSection, offset } = target;

        return {
          ...current,
          cards: current.cards.map((card) => {
            if (card.id !== cardId) return card;
            const position = clampCardPosition({
              x: globalX - offset,
              y,
              width: card.width,
              height: card.height,
              sectionWidth: targetSection.width,
              worldHeight: WORLD_HEIGHT,
            });
            return {
              ...card,
              sectionId: targetSection.id,
              ...position,
            };
          }),
        };
      });
    },
    [readOnly, versionConflict],
  );

  const resizeCard = useCallback(
    (cardId: string, width: number, height: number) => {
      if (readOnly || versionConflict) return;
      setState((current) => ({
        ...current,
        cards: current.cards.map((card) => {
          if (card.id !== cardId) return card;
          const size = clampCardSize(width, height);
          const section = current.sections.find(
            (item) => item.id === card.sectionId,
          );
          const position = section
            ? clampCardPosition({
                x: card.x,
                y: card.y,
                ...size,
                sectionWidth: section.width,
                worldHeight: WORLD_HEIGHT,
              })
            : { x: card.x, y: card.y };
          return { ...card, ...size, ...position };
        }),
      }));
    },
    [readOnly, versionConflict],
  );

  const removeCard = useCallback((cardId: string) => {
    if (readOnly || versionConflict) return;
    setState((current) => ({
      ...current,
      cards: current.cards.filter((card) => card.id !== cardId),
    }));
  }, [readOnly, versionConflict]);

  const removeImage = useCallback(async (
    cardId: string,
    scope: "board" | "board-and-references",
    onStage?: (stage: "removing" | "deleting") => void,
  ) => {
    if (readOnly || versionConflict) {
      throw new Error("Tu rol no permite retirar esta imagen.");
    }
    if (removalsInFlight.current.has(cardId)) {
      throw new Error("La eliminación de esta imagen ya está en curso.");
    }

    removalsInFlight.current.add(cardId);
    onStage?.("removing");
    setSyncStatus("saving");
    setSyncError(undefined);
    try {
      const outcome = await executeImageRemoval({
        board: state,
        cardId,
        scope,
        persistBoard: async (next) => {
          if (adapter) {
            lastLocalSave.current = Date.now();
            await adapter.save(next);
          } else {
            window.localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({ version: 1, board: next }),
            );
          }
        },
        deleteAsset: async (assetId) => {
          if (adapter) await adapter.deleteAsset(assetId);
        },
        onBoardSaved: (next) => {
          if (adapter) suppressNextSave.current = true;
          setState(next);
          setSyncStatus(adapter ? "saved" : "local");
        },
        onDeleting: () => onStage?.("deleting"),
      });

      if (outcome.reference === "deleted") {
        window.dispatchEvent(new CustomEvent("moodboard:assets-changed"));
        return {
          status: "deleted" as const,
          message: "La tarjeta se retiró y la imagen se eliminó definitivamente de Referencias.",
        };
      }
      if (outcome.reference === "retained-after-error") {
        const mapped = readBackendError(outcome.cause);
        const detail = mapped.code === "ASSET_IN_USE"
          ? "La imagen todavía se usa en otro lugar."
          : mapped.code === "UNAUTHORIZED"
            ? "Tu sesión expiró; vuelve a ingresar para completar la limpieza."
          : frontendErrorMessage(outcome.cause, "No pudimos eliminar el archivo.");
        return {
          status: "reference-retained" as const,
          message: `La tarjeta fue retirada, pero la referencia se conservó. ${detail} Puedes reintentar desde Referencias.`,
        };
      }
      return {
        status: "removed" as const,
        message: "La tarjeta se retiró del tablero. La imagen continúa disponible en Referencias.",
      };
    } catch (cause) {
      const mapped = readBackendError(cause);
      const message = frontendErrorMessage(
        cause,
        "No se pudo retirar la tarjeta. No se modificó la referencia.",
      );
      setSyncStatus("error");
      setSyncError(message);
      if (mapped.code === "VERSION_CONFLICT") setVersionConflict(true);
      throw new Error(message);
    } finally {
      removalsInFlight.current.delete(cardId);
    }
  }, [adapter, readOnly, state, versionConflict]);

  const updateCardText = useCallback((cardId: string, title: string, content: string) => {
    if (readOnly || versionConflict) return;
    setState((current) => ({
      ...current,
      cards: current.cards.map((card) =>
        card.id === cardId ? { ...card, title: title.trim() || "Sin título", content } : card,
      ),
    }));
  }, [readOnly, versionConflict]);

  const setZoom = useCallback((zoom: number) => {
    setState((current) => ({
      ...current,
      zoom: Math.max(0.5, Math.min(zoom, 1.25)),
    }));
  }, []);

  const resetBoard = useCallback(() => {
    if (readOnly || versionConflict) return;
    const next = cloneDefaultBoard();
    if (!adapter) {
      setState(next);
      return;
    }

    const sectionIds = new Map(
      next.sections.map((section) => [section.id, crypto.randomUUID()]),
    );
    setState({
      ...next,
      sections: next.sections.map((section) => ({
        ...section,
        id: sectionIds.get(section.id)!,
      })),
      cards: next.cards.map((card) => ({
        ...card,
        id: crypto.randomUUID(),
        sectionId: sectionIds.get(card.sectionId)!,
      })),
    });
  }, [adapter, readOnly, versionConflict]);

  const actions = useMemo<BoardActions>(
    () => ({
      addSection,
      addNote,
      addImages,
      moveCard,
      resizeCard,
      removeCard,
      removeImage,
      updateCardText,
      setZoom,
      resetBoard,
    }),
    [
      addImages,
      addNote,
      addSection,
      moveCard,
      removeCard,
      removeImage,
      updateCardText,
      resetBoard,
      resizeCard,
      setZoom,
    ],
  );

  const meta = useMemo<BoardMeta>(
    () => ({
      hydrated,
      syncStatus,
      syncError,
      canEdit: !readOnly && !versionConflict,
      versionConflict,
      worldWidth,
      sectionOffsets,
    }),
    [
      hydrated,
      sectionOffsets,
      syncError,
      syncStatus,
      readOnly,
      versionConflict,
      worldWidth,
    ],
  );

  const value = useMemo(
    () => ({ state, actions, meta }),
    [actions, meta, state],
  );

  return <BoardContext value={value}>{children}</BoardContext>;
}

export function useBoard() {
  const context = use(BoardContext);
  if (!context) {
    throw new Error("useBoard must be used inside BoardProvider");
  }
  return context;
}

export const BOARD_WORLD_HEIGHT = WORLD_HEIGHT;
export const BOARD_SECTION_GAP = SECTION_GAP;
