import { tabNodeSchema, tabsetNodeSchema } from "@dashfoo/core";
import { z } from "zod";

import type { TransferNode } from "./drag-group";

const NODE_TYPE = "application/x-dashfoo-node";

/** Drag data is unreadable until the drop, so what `dragover` needs rides in a type name. */
const MARKER_PREFIX = "application/x-dashfoo-drag+";

const markerSchema = z.object({
  appId: z.string(),
  documentId: z.string(),
  dragId: z.string(),
  group: z.string(),
  id: z.string(),
  kind: z.enum(["tab", "tabset"]),
  origin: z.string(),
  scope: z.enum(["app", "origin"]),
});

type Marker = z.infer<typeof markerSchema>;

const payloadSchema = z.object({ node: z.union([tabNodeSchema, tabsetNodeSchema]) });

/** What a receiving copy of the app posts back once a cross-app drop lands. */
const acceptSchema = z.object({ accepted: z.string() });

const toHex = (text: string): string =>
  [...new TextEncoder().encode(text)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const fromHex = (hex: string): string =>
  new TextDecoder().decode(
    Uint8Array.from(hex.match(/../gv) ?? [], (pair) => Number.parseInt(pair, 16)),
  );

const parseJson = <T>(schema: z.ZodType<T>, text: string): T | undefined => {
  try {
    return schema.safeParse(JSON.parse(text)).data;
  } catch {
    return undefined;
  }
};

const writeTransfer = (transfer: DataTransfer, marker: Marker, node: TransferNode): void => {
  transfer.setData(NODE_TYPE, JSON.stringify({ node }));
  transfer.setData(`${MARKER_PREFIX}${toHex(JSON.stringify(marker))}`, "");
  transfer.effectAllowed = "move";
};

/** Only drags from this origin count: data from any other page is readable on drop too. */
const readMarker = (transfer: DataTransfer | null): Marker | null => {
  const type = [...(transfer?.types ?? [])].find((name) => name.startsWith(MARKER_PREFIX));

  if (type === undefined) {
    return null;
  }

  const parsed = parseJson(markerSchema, fromHex(type.slice(MARKER_PREFIX.length)));

  return parsed?.origin === location.origin ? parsed : null;
};

const readNode = (transfer: DataTransfer | null): TransferNode | undefined =>
  parseJson(payloadSchema, transfer?.getData(NODE_TYPE) ?? "")?.node;

const readAccepted = (event: MessageEvent): string | undefined =>
  acceptSchema.safeParse(event.data).data?.accepted;

export { MARKER_PREFIX, NODE_TYPE, readAccepted, readMarker, readNode, writeTransfer };

export type { Marker };
