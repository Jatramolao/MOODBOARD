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
} from "@/lib/board-types";
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

  return {
    kind: "supabase",

    async load() {
      const [boardResult, sectionsResult, itemsResult] = await Promise.all([
        client.from("boards").select("zoom").eq("id", boardId).single(),
        client
          .from("board_sections")
          .select("id,name,width,position")
          .eq("board_id", boardId)
          .order("position"),
        client
          .from("board_items")
          .select(
            "id,section_id,type,x,y,width,height,title,content,image_path,source_url,colors",
          )
          .eq("board_id", boardId)
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
        const { data } = await client.storage
          .from(ASSET_BUCKET)
          .createSignedUrls(privatePaths, SIGNED_URL_TTL_SECONDS);
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
        imageUrl:
          (row.image_path && signedByPath.get(row.image_path)) ||
          row.source_url ||
          undefined,
      }));

      return {
        sections,
        cards,
        zoom: Number(boardResult.data.zoom ?? 0.82),
      };
    },

    async save(board) {
      const { error } = await client.rpc("save_board_snapshot", {
        p_board_id: boardId,
        p_zoom: board.zoom,
        p_sections: board.sections.map((section, position) => ({
          ...section,
          position,
        })),
        p_items: board.cards.map((card) => ({
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
          colors: card.colors ?? null,
        })),
      });
      if (error) throw error;
    },

    async uploadImages(files) {
      return Promise.all(
        files.map((file) => {
          const path = `${projectId}/${boardId}/${crypto.randomUUID()}-${safeAssetName(file.name)}`;
          return uploadAsset(file, path, client);
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
