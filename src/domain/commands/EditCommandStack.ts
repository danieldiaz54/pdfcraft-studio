import type { DocumentSession } from "../entities/DocumentSession";

export const MAX_HISTORY_SNAPSHOTS = 40;

export interface EditLogEntry {
  readonly id: string;
  readonly label: string;
  readonly timestampIso: string;
}

export interface CommandStackState {
  readonly past: ReadonlyArray<DocumentSession>;
  readonly present: DocumentSession | null;
  readonly future: ReadonlyArray<DocumentSession>;
  readonly log: ReadonlyArray<EditLogEntry>;
}

/** Initialize an empty command history stack. */
export function createCommandStack(
  initial: DocumentSession | null = null,
  initialLabel?: string,
): CommandStackState {
  const log: EditLogEntry[] =
    initial && initialLabel
      ? [
          {
            id: `log-${Date.now()}`,
            label: initialLabel,
            timestampIso: initial.updatedAtIso,
          },
        ]
      : [];
  return {
    past: [],
    present: initial,
    future: [],
    log,
  };
}

/** Push a new immutable document snapshot onto the command stack, clearing redo branch. */
export function pushState(
  stack: CommandStackState,
  nextSession: DocumentSession,
  label: string,
  entryId: string,
): CommandStackState {
  const nextPast = stack.present
    ? [...stack.past.slice(-(MAX_HISTORY_SNAPSHOTS - 1)), stack.present]
    : stack.past;
  const entry: EditLogEntry = {
    id: entryId,
    label,
    timestampIso: nextSession.updatedAtIso,
  };
  return {
    past: nextPast,
    present: nextSession,
    future: [],
    log: [entry, ...stack.log].slice(0, MAX_HISTORY_SNAPSHOTS),
  };
}

/** Replace active session without recording an undo step (e.g. non-destructive selection). */
export function replacePresentWithoutHistory(
  stack: CommandStackState,
  nextSession: DocumentSession,
): CommandStackState {
  return {
    ...stack,
    present: nextSession,
  };
}

/** Step backwards in command history cleanly. */
export function undoState(
  stack: CommandStackState,
  entryId: string,
  nowIso: string,
): CommandStackState {
  if (stack.past.length === 0 || !stack.present) {
    return stack;
  }
  const previous = stack.past[stack.past.length - 1];
  if (!previous) {
    return stack;
  }
  const nextPast = stack.past.slice(0, -1);
  return {
    past: nextPast,
    present: previous,
    future: [stack.present, ...stack.future],
    log: [
      { id: entryId, label: "Deshacer acción anterior", timestampIso: nowIso },
      ...stack.log,
    ].slice(0, MAX_HISTORY_SNAPSHOTS),
  };
}

/** Step forwards in command history cleanly. */
export function redoState(
  stack: CommandStackState,
  entryId: string,
  nowIso: string,
): CommandStackState {
  if (stack.future.length === 0 || !stack.present) {
    return stack;
  }
  const next = stack.future[0];
  if (!next) {
    return stack;
  }
  const nextFuture = stack.future.slice(1);
  return {
    past: [...stack.past, stack.present],
    present: next,
    future: nextFuture,
    log: [
      { id: entryId, label: "Rehacer acción", timestampIso: nowIso },
      ...stack.log,
    ].slice(0, MAX_HISTORY_SNAPSHOTS),
  };
}

export function canUndo(stack: CommandStackState): boolean {
  return stack.past.length > 0;
}

export function canRedo(stack: CommandStackState): boolean {
  return stack.future.length > 0;
}
