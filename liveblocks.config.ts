import { LiveList, LiveObject } from "@liveblocks/client";
import { BuilderField, BuilderForm } from "@/lib/form-types";

export type Presence = {
  cursor: { x: number; y: number } | null;
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
