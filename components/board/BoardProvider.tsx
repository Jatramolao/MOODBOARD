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
import type {
  BoardAdapter,
  UploadedBoardAsset,
} from "@/lib/board-adapter";
import { cloneDefaultBoard } from "@/lib/board-data";
import type {
  BoardActions,
  BoardCard,
  BoardMeta,
  BoardState,
} from "@/lib/board-types";

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
        setSyncStatus("error");
        const message = error instanceof Error ? error.message : "No se pudo guardar.";
        setSyncError(message);
        if (message.includes("cambió en otro dispositivo") || message.includes("VERSION_CONFLICT")) {
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
      setSyncError(
        error instanceof Error ? error.message : "No se pudo subir la imagen.",
      );
      return;
    }

    startTransition(() => {
      setState((current) => {
        const section = current.sections[0];
        const additions = assets.map<BoardCard>((asset, index) => ({
          id: crypto.randomUUID(),
          sectionId: section.id,
          type: "image",
          x: 72 + ((current.cards.length + index) % 3) * 250,
          y: 136 + ((current.cards.length + index) % 4) * 180,
          width: 220,
          height: 270,
          imageUrl: asset.imageUrl,
          imagePath: asset.imagePath,
          assetId: asset.assetId,
          title: accepted[index].name.replace(/\.[^.]+$/, ""),
        }));
        return { ...current, cards: [...current.cards, ...additions] };
      });
    });
  }, [adapter, readOnly, versionConflict]);

  const moveCard = useCallback(
    (cardId: string, globalX: number, y: number) => {
      if (readOnly || versionConflict) return;
      setState((current) => {
        let targetSection = current.sections[0];
        let offset = 0;
        for (const section of current.sections) {
          const end = offset + section.width + SECTION_GAP;
          if (globalX < end) {
            targetSection = section;
            break;
          }
          offset = end;
        }

        return {
          ...current,
          cards: current.cards.map((card) => {
            if (card.id !== cardId) return card;
            const localX = Math.max(
              18,
              Math.min(globalX - offset, targetSection.width - card.width - 18),
            );
            return {
              ...card,
              sectionId: targetSection.id,
              x: localX,
              y: Math.max(74, Math.min(y, WORLD_HEIGHT - card.height - 26)),
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
        cards: current.cards.map((card) =>
          card.id === cardId
            ? {
                ...card,
                width: Math.max(150, Math.min(width, 520)),
                height: Math.max(110, Math.min(height, 620)),
              }
            : card,
        ),
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
