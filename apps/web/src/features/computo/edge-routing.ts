import type { TransitionDefinition } from "@computo/automata-core";

export const HANDLE_IDS = {
  targetLeft: "target-left",
  targetRight: "target-right",
  targetBottom: "target-bottom",
  sourceRight: "source-right",
  sourceBottom: "source-bottom",
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

export type SelfLoopSide = "top" | "right" | "bottom";

type SelfLoopRoute = {
  sourceHandle: TransitionHandleId;
  targetHandle: TransitionHandleId;
  loopSlot: number;
  loopTier: number;
  loopSide: SelfLoopSide;
};

const VALID_HANDLE_IDS = new Set<string>(Object.values(HANDLE_IDS));

const SELF_LOOP_SLOTS: ReadonlyArray<{
  sourceHandle: TransitionHandleId;
  targetHandle: TransitionHandleId;
  loopSide: SelfLoopSide;
}> = [
  {
    sourceHandle: HANDLE_IDS.sourceTopRight,
    targetHandle: HANDLE_IDS.targetTopLeft,
    loopSide: "top",
  },
  {
    sourceHandle: HANDLE_IDS.sourceRight,
    targetHandle: HANDLE_IDS.targetRight,
    loopSide: "right",
  },
  {
    sourceHandle: HANDLE_IDS.sourceBottom,
    targetHandle: HANDLE_IDS.targetBottom,
    loopSide: "bottom",
  },
];

export const SELF_LOOP_SLOT_COUNT = SELF_LOOP_SLOTS.length;

const HANDLE_SIDE_BY_ID: Partial<Record<TransitionHandleId, SelfLoopSide>> = {
  [HANDLE_IDS.sourceTopLeft]: "top",
  [HANDLE_IDS.sourceTopCenter]: "top",
  [HANDLE_IDS.sourceTopRight]: "top",
  [HANDLE_IDS.targetTopLeft]: "top",
  [HANDLE_IDS.targetTopCenter]: "top",
  [HANDLE_IDS.targetTopRight]: "top",
  [HANDLE_IDS.sourceRight]: "right",
  [HANDLE_IDS.targetRight]: "right",
  [HANDLE_IDS.sourceBottom]: "bottom",
  [HANDLE_IDS.targetBottom]: "bottom",
};

export const DEFAULT_REGULAR_SOURCE_HANDLE = HANDLE_IDS.sourceRight;
export const DEFAULT_REGULAR_TARGET_HANDLE = HANDLE_IDS.targetLeft;

function isValidHandleId(handleId: string | null | undefined): handleId is TransitionHandleId {
  return handleId !== undefined && handleId !== null && VALID_HANDLE_IDS.has(handleId);
}

function getLoopSideFromHandles(
  sourceHandle: TransitionHandleId,
  targetHandle: TransitionHandleId,
): SelfLoopSide | undefined {
  const sourceSide = HANDLE_SIDE_BY_ID[sourceHandle];
  const targetSide = HANDLE_SIDE_BY_ID[targetHandle];
  if (sourceSide !== undefined && sourceSide === targetSide) {
    return sourceSide;
  }
  if (targetSide !== undefined) {
    return targetSide;
  }
  if (sourceSide !== undefined) {
    return sourceSide;
  }
  return undefined;
}

function getLoopSlotForSide(loopSide: SelfLoopSide): number {
  if (loopSide === "right") {
    return 1;
  }
  if (loopSide === "bottom") {
    return 2;
  }
  return 0;
}

function getExplicitSelfLoopRoute(
  sourceHandle: TransitionHandleId,
  targetHandle: TransitionHandleId,
  selfLoopIndex: number,
): SelfLoopRoute {
  const safeIndex = Math.max(0, selfLoopIndex);
  const loopTier = Math.floor(safeIndex / SELF_LOOP_SLOT_COUNT);
  const loopSide = getLoopSideFromHandles(sourceHandle, targetHandle) ?? "top";
  const loopSlot = getLoopSlotForSide(loopSide);

  return {
    sourceHandle,
    targetHandle,
    loopSlot,
    loopTier,
    loopSide,
  };
}

function resolveSelfLoopHandles(
  sourceHandle: string | null | undefined,
  targetHandle: string | null | undefined,
  selfLoopIndex: number,
): SelfLoopRoute {
  if (isValidHandleId(sourceHandle) && isValidHandleId(targetHandle)) {
    return getExplicitSelfLoopRoute(sourceHandle, targetHandle, selfLoopIndex);
  }
  return getSelfLoopRoute(selfLoopIndex);
}

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
    loopSide: slot.loopSide,
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
  if (isValidHandleId(handleId)) {
    return handleId;
  }

  return fallback;
}

export function getFallbackTargetHandle(sourceHandle: TransitionHandleId): TransitionHandleId {
  if (sourceHandle === HANDLE_IDS.sourceBottom) {
    return HANDLE_IDS.targetBottom;
  }
  if (sourceHandle === HANDLE_IDS.sourceRight) {
    return HANDLE_IDS.targetRight;
  }
  return HANDLE_IDS.targetTopCenter;
}

export function getFallbackSourceHandle(targetHandle: TransitionHandleId): TransitionHandleId {
  if (targetHandle === HANDLE_IDS.targetBottom) {
    return HANDLE_IDS.sourceBottom;
  }
  if (targetHandle === HANDLE_IDS.targetRight) {
    return HANDLE_IDS.sourceRight;
  }
  return HANDLE_IDS.sourceTopCenter;
}

export function getResolvedCreatedHandles(
  sourceHandle: string | null | undefined,
  targetHandle: string | null | undefined,
): TransitionHandleSelection {
  const sourceValid = isValidHandleId(sourceHandle);
  const targetValid = isValidHandleId(targetHandle);

  if (sourceValid && targetValid) {
    return {
      sourceHandle,
      targetHandle,
    };
  }
  if (sourceValid) {
    return {
      sourceHandle,
      targetHandle: getFallbackTargetHandle(sourceHandle),
    };
  }
  if (targetValid) {
    return {
      sourceHandle: getFallbackSourceHandle(targetHandle),
      targetHandle,
    };
  }
  return {
    sourceHandle: DEFAULT_REGULAR_SOURCE_HANDLE,
    targetHandle: DEFAULT_REGULAR_TARGET_HANDLE,
  };
}

export function resolveTransitionHandles(
  transition: TransitionDefinition,
  selfLoopIndex = 0,
): SelfLoopRoute | (TransitionHandleSelection & { loopSlot: null; loopTier: 0 }) {
  if (transition.from === transition.to) {
    return resolveSelfLoopHandles(transition.sourceHandle, transition.targetHandle, selfLoopIndex);
  }

  if (transition.sourceHandle === undefined && transition.targetHandle === undefined) {
    return {
      sourceHandle: DEFAULT_REGULAR_SOURCE_HANDLE,
      targetHandle: DEFAULT_REGULAR_TARGET_HANDLE,
      loopSlot: null,
      loopTier: 0,
    };
  }

  const sourceHandle = coerceHandleId(transition.sourceHandle, DEFAULT_REGULAR_SOURCE_HANDLE);
  const fallbackTarget = getFallbackTargetHandle(sourceHandle);

  return {
    sourceHandle,
    targetHandle: coerceHandleId(transition.targetHandle, fallbackTarget),
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
    if (isValidHandleId(handles.sourceHandle) && isValidHandleId(handles.targetHandle)) {
      return {
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
      };
    }
    const loopRoute = getNextSelfLoopRoute(transitions, from);
    return { sourceHandle: loopRoute.sourceHandle, targetHandle: loopRoute.targetHandle };
  }

  return getResolvedCreatedHandles(handles.sourceHandle, handles.targetHandle);
}
