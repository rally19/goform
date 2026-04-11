import { LiveList, LiveObject } from "@liveblocks/client";
import { BuilderField, BuilderForm } from "@/lib/form-types";

export type Presence = {
  cursor: { 
    x: number; // For canvas: relative to form root. For panels: percentage.
    y: number; // Fallback y
    area: "components" | "canvas" | "settings";
    anchorId?: string; // Nearest component ID
    relY?: number; // Y offset from anchor's top-edge
  } | null;
  selectedFieldId: string | null;
  draggingFieldId: string | null;
};

export type LiveblocksStorage = {
  fields: LiveList<LiveObject<BuilderField>>;
  formMetadata: LiveObject<BuilderForm>;
};

export type UserMeta = {
  id: string;
  info: {
    name: string;
    avatar: string;
    color: string;
  };
};

declare global {
  interface Liveblocks {
    Presence: Presence;
    Storage: LiveblocksStorage;
    UserMeta: UserMeta;
  }
}

export {};
