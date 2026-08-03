"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type {
  BoardAdapter,
  UploadedBoardAsset,
} from "@/lib/board-adapter";
import type {
  BoardCard,
  BoardCardType,
  BoardSection,
  BoardState,
} from "@/lib/board-types";
import {
  buildBoardOperations,
  cloneBoard,
} from "@/lib/backend/board-operations";
import { createClient } from "./client";
import { getSupabaseEnv } from "./env";

const ASSET_BUCKET = "board-assets";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 8;
const RESUMABLE_THRESHOLD = 6 * 1024 * 1024;

type BoardAdapterOptions = {
  boardId: string;
  projectId: string;
};

type SectionRow = {
  id: string;
  name: string;
  width: number;
  position: number;
};

type ItemRow = {
  id: string;
  section_id: string;
  type: BoardCardType;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string | null;
  content: string | null;
  image_path: string | null;
  source_url: string | null;
  colors: string[] | null;
  asset_id: string | null;
};


function safeAssetName(name: string) {
  const extension = name.includes(".") ? name.split(".").pop() : "jpg";
  const stem = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${stem || "imagen"}.${extension?.toLowerCase()}`;
}

async function uploadResumable(
  file: File,
  objectPath: string,
  client: SupabaseClient,
) {
  const [{ Upload }, sessionResult] = await Promise.all([
    import("tus-js-client"),
    client.auth.getSession(),
  ]);
  const accessToken = sessionResult.data.session?.access_token;
  if (!accessToken) throw new Error("La sesión expiró. Vuelve a ingresar.");

  const { url } = getSupabaseEnv();

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: `${url}/storage/v1/upload/resumable`,
      headers: { authorization: `Bearer ${accessToken}` },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 1_000, 3_000, 5_000, 10_000],
      metadata: {
        bucketName: ASSET_BUCKET,
        objectName: objectPath,
        contentType: file.type,
        cacheControl: "3600",
      },
      onError: reject,
      onSuccess: () => resolve(),
    });
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads[0]) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    }, reject);
  });
}

async function uploadAsset(
  file: File,
  path: string,
  client: SupabaseClient,
): Promise<UploadedBoardAsset> {
  if (file.size > RESUMABLE_THRESHOLD) {
    await uploadResumable(file, path, client);
  } else {
    const { error } = await client.storage
      .from(ASSET_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
  }

  const { data, error } = await client.storage
    .from(ASSET_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return { imagePath: path, imageUrl: data.signedUrl };
}

export function createSupabaseBoardAdapter({
  boardId,
  projectId,
}: BoardAdapterOptions): BoardAdapter | null {
  const client = createClient();
  if (!client) return null;
  let channel: RealtimeChannel | null = null;
  let boardVersion = 1;
  let lastSavedBoard: BoardState | null = null;
  let saveQueue: Promise<void> = Promise.resolve();

  return {
    kind: "supabase",

    async load() {
      const [boardResult, sectionsResult, itemsResult] = await Promise.all([
        client.from("boards").select("zoom,version").eq("id", boardId).single(),
        client
          .from("board_sections")
          .select("id,name,width,position")
          .eq("board_id", boardId)
          .order("position"),
        client
          .from("board_items")
          .select(
            "id,section_id,type,x,y,width,height,title,content,image_path,source_url,colors,asset_id",
          )
          .eq("board_id", boardId)
          .is("deleted_at", null)
          .order("created_at"),
      ]);

      if (boardResult.error) throw boardResult.error;
      if (sectionsResult.error) throw sectionsResult.error;
      if (itemsResult.error) throw itemsResult.error;

      const sections = (sectionsResult.data as SectionRow[]).map<BoardSection>(
        ({ id, name, width }) => ({ id, name, width: Number(width) }),
      );
      const rows = itemsResult.data as ItemRow[];
      const privatePaths = rows
        .map((row) => row.image_path)
        .filter((path): path is string => Boolean(path));
      const signedByPath = new Map<string, string>();

      if (privatePaths.length) {
        const { data, error } = await client.storage
          .from(ASSET_BUCKET)
          .createSignedUrls(privatePaths, SIGNED_URL_TTL_SECONDS);
        if (error) throw error;
        data?.forEach((asset: { path?: string; signedUrl?: string }) => {
          if (asset.path && asset.signedUrl) {
            signedByPath.set(asset.path, asset.signedUrl);
          }
        });
      }

      const cards = rows.map<BoardCard>((row) => ({
        id: row.id,
        sectionId: row.section_id,
        type: row.type,
        x: Number(row.x),
        y: Number(row.y),
        width: Number(row.width),
        height: Number(row.height),
        title: row.title ?? undefined,
        content: row.content ?? undefined,
        colors: row.colors ?? undefined,
        imagePath: row.image_path ?? undefined,
        assetId: row.asset_id ?? undefined,
        imageUrl:
          (row.image_path && signedByPath.get(row.image_path)) ||
          row.source_url ||
          undefined,
      }));

      const loadedBoard = {
        sections,
        cards,
        zoom: Number(boardResult.data.zoom ?? 0.82),
      };
      boardVersion = Number(boardResult.data.version ?? 1);
      lastSavedBoard = cloneBoard(loadedBoard);
      return loadedBoard;
    },

    async save(board) {
      const requestedBoard = cloneBoard(board);
      saveQueue = saveQueue.catch(() => undefined).then(async () => {
        if (!lastSavedBoard) {
          lastSavedBoard = cloneBoard(requestedBoard);
          return;
        }
        const operations = buildBoardOperations(lastSavedBoard, requestedBoard);
        if (!operations.length) return;

        const { data, error } = await client.rpc("apply_board_operations", {
          p_board_id: boardId,
          p_base_version: boardVersion,
          p_operation_id: crypto.randomUUID(),
          p_operations: operations,
        });
        if (error) {
          if (error.message.includes("VERSION_CONFLICT")) {
            throw new Error(
              "El tablero cambió en otro dispositivo. Recarga para integrar los cambios.",
            );
          }
          throw error;
        }
        const result = Array.isArray(data) ? data[0] : data;
        boardVersion = Number(result?.board_version ?? boardVersion + 1);
        lastSavedBoard = cloneBoard(requestedBoard);
      });
      return saveQueue;
    },

    async uploadImages(files) {
      return Promise.all(
        files.map(async (file) => {
          const path = `${projectId}/${boardId}/${crypto.randomUUID()}-${safeAssetName(file.name)}`;
          const uploaded = await uploadAsset(file, path, client);
          const { data, error } = await client.rpc("register_asset", {
            p_project_id: projectId,
            p_board_id: boardId,
            p_storage_path: path,
            p_original_name: file.name,
            p_mime_type: file.type,
            p_byte_size: file.size,
          });
          if (error) {
            await client.storage.from(ASSET_BUCKET).remove([path]);
            throw error;
          }
          return {
            ...uploaded,
            assetId: typeof data === "string" ? data : undefined,
          };
        }),
      );
    },

    subscribe(onRemoteChange) {
      channel = client
        .channel(`board:${boardId}`, { config: { private: true } })
        .on("broadcast", { event: "board_changed" }, onRemoteChange)
        .subscribe();

      return () => {
        if (channel) void client.removeChannel(channel);
        channel = null;
      };
    },
  };
}
