import type { TransitionDefinition } from "@computo/automata-core";

export const HANDLE_IDS = {
  targetLeft: "target-left",
  sourceRight: "source-right",
  targetTopLeft: "target-top-left",
  sourceTopLeft: "source-top-left",
  targetTopCenter: "target-top-center",
  sourceTopCenter: "source-top-center",
  targetTopRight: "target-top-right",
  sourceTopRight: "source-top-right",
} as const;

export type TransitionHandleId = (typeof HANDLE_IDS)[keyof typeof HANDLE_IDS];

export type TransitionHandleSelection = {
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

type SelfLoopRoute = {
  sourceHandle: TransitionHandleId;
  targetHandle: TransitionHandleId;
  loopSlot: number;
  loopTier: number;
};

const VALID_HANDLE_IDS = new Set<string>(Object.values(HANDLE_IDS));

const SELF_LOOP_SLOTS: ReadonlyArray<{
  sourceHandle: TransitionHandleId;
  targetHandle: TransitionHandleId;
}> = [
  {
    sourceHandle: HANDLE_IDS.sourceTopRight,
    targetHandle: HANDLE_IDS.targetTopLeft,
  },
  {
    sourceHandle: HANDLE_IDS.sourceTopLeft,
    targetHandle: HANDLE_IDS.targetTopCenter,
  },
  {
    sourceHandle: HANDLE_IDS.sourceTopCenter,
    targetHandle: HANDLE_IDS.targetTopRight,
  },
];

export const SELF_LOOP_SLOT_COUNT = SELF_LOOP_SLOTS.length;

export function getSelfLoopRoute(loopIndex: number): SelfLoopRoute {
  const safeIndex = Math.max(0, loopIndex);
  const loopSlot = safeIndex % SELF_LOOP_SLOT_COUNT;
  const loopTier = Math.floor(safeIndex / SELF_LOOP_SLOT_COUNT);
  const slot = SELF_LOOP_SLOTS[loopSlot] ?? SELF_LOOP_SLOTS[0];

  return {
    sourceHandle: slot.sourceHandle,
    targetHandle: slot.targetHandle,
    loopSlot,
    loopTier,
  };
}

export function getNextSelfLoopRoute(
  transitions: TransitionDefinition[],
  stateId: string,
): SelfLoopRoute {
  const loopCount = transitions.filter(
    (transition) => transition.from === stateId && transition.to === stateId,
  ).length;

  return getSelfLoopRoute(loopCount);
}

function coerceHandleId(
  handleId: string | null | undefined,
  fallback: TransitionHandleId,
): TransitionHandleId {
  if (handleId !== undefined && handleId !== null && VALID_HANDLE_IDS.has(handleId)) {
    return handleId as TransitionHandleId;
  }

  return fallback;
}

export function resolveTransitionHandles(
  transition: TransitionDefinition,
  selfLoopIndex = 0,
): SelfLoopRoute | (TransitionHandleSelection & { loopSlot: null; loopTier: 0 }) {
  if (transition.from === transition.to) {
    return getSelfLoopRoute(selfLoopIndex);
  }

  return {
    sourceHandle: coerceHandleId(transition.sourceHandle, HANDLE_IDS.sourceRight),
    targetHandle: coerceHandleId(transition.targetHandle, HANDLE_IDS.targetLeft),
    loopSlot: null,
    loopTier: 0,
  };
}

export function resolveCreatedTransitionHandles(
  transitions: TransitionDefinition[],
  from: string,
  to: string,
  handles: TransitionHandleSelection,
): TransitionHandleSelection {
  if (from === to) {
    const loopRoute = getNextSelfLoopRoute(transitions, from);
    return {
      sourceHandle: loopRoute.sourceHandle,
      targetHandle: loopRoute.targetHandle,
    };
  }

  return {
    sourceHandle: coerceHandleId(handles.sourceHandle, HANDLE_IDS.sourceRight),
    targetHandle: coerceHandleId(handles.targetHandle, HANDLE_IDS.targetLeft),
  };
}
