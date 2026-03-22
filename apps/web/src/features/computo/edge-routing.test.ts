import { describe, expect, test } from "bun:test";

import {
  HANDLE_IDS,
  SELF_LOOP_SLOT_COUNT,
  getSelfLoopRoute,
  resolveCreatedTransitionHandles,
  resolveTransitionHandles,
} from "./edge-routing";

describe("edge routing", () => {
  test("cycles self-loop slots through top, right and bottom before next tier", () => {
    const first = getSelfLoopRoute(0);
    const second = getSelfLoopRoute(1);
    const third = getSelfLoopRoute(2);
    const fourth = getSelfLoopRoute(3);

    expect(first.loopSide).toBe("top");
    expect(second.loopSide).toBe("right");
    expect(third.loopSide).toBe("bottom");
    expect(new Set([first.targetHandle, second.targetHandle, third.targetHandle]).size).toBe(3);
    expect(SELF_LOOP_SLOT_COUNT).toBe(3);
    expect(first.loopTier).toBe(0);
    expect(second.loopTier).toBe(0);
    expect(third.loopTier).toBe(0);
    expect(fourth.loopTier).toBe(1);
  });

  test("preserves chosen top handles for regular transitions", () => {
    const handles = resolveCreatedTransitionHandles([], "q0", "q1", {
      sourceHandle: HANDLE_IDS.sourceTopCenter,
      targetHandle: HANDLE_IDS.targetTopLeft,
    });

    expect(handles).toEqual({
      sourceHandle: HANDLE_IDS.sourceTopCenter,
      targetHandle: HANDLE_IDS.targetTopLeft,
    });
  });

  test("preserves explicit self-loop side handles", () => {
    const handles = resolveCreatedTransitionHandles(
      [
        {
          id: "t0",
          kind: "FA",
          from: "q0",
          to: "q0",
          input: "",
        },
      ],
      "q0",
      "q0",
      {
        sourceHandle: HANDLE_IDS.sourceRight,
        targetHandle: HANDLE_IDS.targetRight,
      },
    );

    expect(handles).toEqual({
      sourceHandle: HANDLE_IDS.sourceRight,
      targetHandle: HANDLE_IDS.targetRight,
    });
  });

  test("auto-assigns self-loop side when created without explicit handles", () => {
    const handles = resolveCreatedTransitionHandles(
      [
        {
          id: "t0",
          kind: "FA",
          from: "q0",
          to: "q0",
          input: "",
        },
      ],
      "q0",
      "q0",
      {},
    );

    expect(handles).toEqual({
      sourceHandle: HANDLE_IDS.sourceRight,
      targetHandle: HANDLE_IDS.targetRight,
    });
  });

  test("falls back to default side anchors for legacy regular transitions", () => {
    const handles = resolveTransitionHandles({
      id: "t1",
      kind: "FA",
      from: "q0",
      to: "q1",
      input: "a",
    });

    expect(handles).toMatchObject({
      sourceHandle: HANDLE_IDS.sourceRight,
      targetHandle: HANDLE_IDS.targetLeft,
      loopSlot: null,
      loopTier: 0,
    });
  });

  test("regular transitions can use bottom connector pair", () => {
    const handles = resolveTransitionHandles({
      id: "t2",
      kind: "FA",
      from: "q0",
      to: "q1",
      input: "b",
      sourceHandle: HANDLE_IDS.sourceBottom,
      targetHandle: HANDLE_IDS.targetBottom,
    });

    expect(handles).toMatchObject({
      sourceHandle: HANDLE_IDS.sourceBottom,
      targetHandle: HANDLE_IDS.targetBottom,
      loopSlot: null,
      loopTier: 0,
    });
  });
});
