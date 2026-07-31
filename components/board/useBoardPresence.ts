"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type BoardPerson = {
  id: string;
  name: string;
  initials: string;
  tone: "clay" | "sand" | "ink";
};

type PresenceUser = {
  id: string;
  name: string;
  initials: string;
};

const tones: BoardPerson["tone"][] = ["clay", "sand", "ink"];

export function useBoardPresence(
  boardId: string | undefined,
  currentUser: PresenceUser | undefined,
) {
  const [people, setPeople] = useState<BoardPerson[]>([]);

  useEffect(() => {
    if (!boardId || !currentUser) return;
    const client = createClient();
    if (!client) return;

    const channel = client.channel(`board:${boardId}:presence`, {
      config: { private: true, presence: { key: currentUser.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const present = Object.values(channel.presenceState()).flat();
        const unique = new Map<string, BoardPerson>();

        present.forEach((entry, index) => {
          const person = entry as unknown as PresenceUser;
          if (!person.id) return;
          unique.set(person.id, {
            id: person.id,
            name: person.name || "Colaborador",
            initials: person.initials || "—",
            tone: tones[index % tones.length],
          });
        });
        setPeople([...unique.values()]);
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.track(currentUser);
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [boardId, currentUser]);

  return people;
}
