import type { DocumentSession } from "../../domain/entities/DocumentSession";

export interface StoredDraftBundle {
  readonly session: DocumentSession;
  readonly sourceBuffers: ReadonlyArray<{
    readonly sourceDocId: string;
    readonly bytes: Uint8Array;
  }>;
}

/** Application boundary for private client-side persistence (IndexedDB). */
export interface DraftStorePort {
  saveDraft(bundle: StoredDraftBundle): Promise<void>;
  loadLatestDraft(): Promise<StoredDraftBundle | null>;
  clearDraft(): Promise<void>;
}
