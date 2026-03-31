/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Unit tests for V-Model state machine transitions
 */

import { describe, it, expect } from "bun:test";
import {
  getNextState,
  getNextStateForMode,
  getNextStateNormal,
  getNextStateForMvp,
  getNextStateForGo,
} from "../../state-machine";
import { VModelState, ExecutionMode } from "../../types";

describe("State Machine - Normal Mode", () => {
  it("should transition from REQUIREMENTS to REQUIREMENTS_REVIEW", () => {
    expect(getNextStateNormal(VModelState.REQUIREMENTS)).toBe(VModelState.REQUIREMENTS_REVIEW);
  });

  it("should transition from REQUIREMENTS_REVIEW to SYSTEM_DESIGN", () => {
    expect(getNextStateNormal(VModelState.REQUIREMENTS_REVIEW)).toBe(VModelState.SYSTEM_DESIGN);
  });

  it("should transition from SYSTEM_DESIGN to SYSTEM_DESIGN_REVIEW", () => {
    expect(getNextStateNormal(VModelState.SYSTEM_DESIGN)).toBe(VModelState.SYSTEM_DESIGN_REVIEW);
  });

  it("should transition from SYSTEM_DESIGN_REVIEW to ARCH_DESIGN", () => {
    expect(getNextStateNormal(VModelState.SYSTEM_DESIGN_REVIEW)).toBe(VModelState.ARCH_DESIGN);
  });

  it("should transition from ARCH_DESIGN to ARCH_DESIGN_REVIEW", () => {
    expect(getNextStateNormal(VModelState.ARCH_DESIGN)).toBe(VModelState.ARCH_DESIGN_REVIEW);
  });

  it("should transition from ARCH_DESIGN_REVIEW to MODULE_DESIGN", () => {
    expect(getNextStateNormal(VModelState.ARCH_DESIGN_REVIEW)).toBe(VModelState.MODULE_DESIGN);
  });

  it("should transition from MODULE_DESIGN to MODULE_DESIGN_REVIEW", () => {
    expect(getNextStateNormal(VModelState.MODULE_DESIGN)).toBe(VModelState.MODULE_DESIGN_REVIEW);
  });

  it("should transition from MODULE_DESIGN_REVIEW to IMPLEMENTATION", () => {
    expect(getNextStateNormal(VModelState.MODULE_DESIGN_REVIEW)).toBe(VModelState.IMPLEMENTATION);
  });

  it("should transition through testing phases correctly", () => {
    expect(getNextStateNormal(VModelState.IMPLEMENTATION)).toBe(VModelState.UNIT_TEST);
    expect(getNextStateNormal(VModelState.UNIT_TEST)).toBe(VModelState.INTEGRATION_TEST);
    expect(getNextStateNormal(VModelState.INTEGRATION_TEST)).toBe(VModelState.SYSTEM_TEST);
    expect(getNextStateNormal(VModelState.SYSTEM_TEST)).toBe(VModelState.ACCEPTANCE_TEST);
    expect(getNextStateNormal(VModelState.ACCEPTANCE_TEST)).toBe(VModelState.CONSOLIDATING);
    expect(getNextStateNormal(VModelState.CONSOLIDATING)).toBe(VModelState.COMPLETE);
  });

  it("should handle terminal states", () => {
    expect(getNextStateNormal(VModelState.COMPLETE)).toBe(VModelState.COMPLETE);
    expect(getNextStateNormal(VModelState.BLOCKED)).toBe(VModelState.BLOCKED);
  });
});

describe("State Machine - MVP Mode", () => {
  it("should skip all review states", () => {
    expect(getNextStateForMvp(VModelState.REQUIREMENTS)).toBe(VModelState.SYSTEM_DESIGN);
    expect(getNextStateForMvp(VModelState.REQUIREMENTS_REVIEW)).toBe(VModelState.SYSTEM_DESIGN);
    expect(getNextStateForMvp(VModelState.SYSTEM_DESIGN)).toBe(VModelState.ARCH_DESIGN);
    expect(getNextStateForMvp(VModelState.SYSTEM_DESIGN_REVIEW)).toBe(VModelState.ARCH_DESIGN);
    expect(getNextStateForMvp(VModelState.ARCH_DESIGN)).toBe(VModelState.MODULE_DESIGN);
    expect(getNextStateForMvp(VModelState.ARCH_DESIGN_REVIEW)).toBe(VModelState.MODULE_DESIGN);
    expect(getNextStateForMvp(VModelState.MODULE_DESIGN)).toBe(VModelState.IMPLEMENTATION);
    expect(getNextStateForMvp(VModelState.MODULE_DESIGN_REVIEW)).toBe(VModelState.IMPLEMENTATION);
  });

  it("should skip intermediate test states", () => {
    expect(getNextStateForMvp(VModelState.IMPLEMENTATION)).toBe(VModelState.SYSTEM_TEST);
    expect(getNextStateForMvp(VModelState.UNIT_TEST)).toBe(VModelState.SYSTEM_TEST);
    expect(getNextStateForMvp(VModelState.INTEGRATION_TEST)).toBe(VModelState.SYSTEM_TEST);
    expect(getNextStateForMvp(VModelState.SYSTEM_TEST)).toBe(VModelState.COMPLETE);
    expect(getNextStateForMvp(VModelState.ACCEPTANCE_TEST)).toBe(VModelState.COMPLETE);
  });

  it("should return null for terminal states", () => {
    expect(getNextStateForMvp(VModelState.COMPLETE)).toBeNull();
    expect(getNextStateForMvp(VModelState.BLOCKED)).toBeNull();
  });
});

describe("State Machine - GO Mode", () => {
  it("should skip all review states", () => {
    expect(getNextStateForGo(VModelState.REQUIREMENTS)).toBe(VModelState.SYSTEM_DESIGN);
    expect(getNextStateForGo(VModelState.REQUIREMENTS_REVIEW)).toBe(VModelState.SYSTEM_DESIGN);
    expect(getNextStateForGo(VModelState.SYSTEM_DESIGN)).toBe(VModelState.ARCH_DESIGN);
    expect(getNextStateForGo(VModelState.SYSTEM_DESIGN_REVIEW)).toBe(VModelState.ARCH_DESIGN);
    expect(getNextStateForGo(VModelState.ARCH_DESIGN)).toBe(VModelState.MODULE_DESIGN);
    expect(getNextStateForGo(VModelState.ARCH_DESIGN_REVIEW)).toBe(VModelState.MODULE_DESIGN);
    expect(getNextStateForGo(VModelState.MODULE_DESIGN)).toBe(VModelState.IMPLEMENTATION);
    expect(getNextStateForGo(VModelState.MODULE_DESIGN_REVIEW)).toBe(VModelState.IMPLEMENTATION);
  });

  it("should skip all testing states", () => {
    expect(getNextStateForGo(VModelState.IMPLEMENTATION)).toBe(VModelState.COMPLETE);
    expect(getNextStateForGo(VModelState.UNIT_TEST)).toBe(VModelState.COMPLETE);
    expect(getNextStateForGo(VModelState.INTEGRATION_TEST)).toBe(VModelState.COMPLETE);
    expect(getNextStateForGo(VModelState.SYSTEM_TEST)).toBe(VModelState.COMPLETE);
    expect(getNextStateForGo(VModelState.ACCEPTANCE_TEST)).toBe(VModelState.COMPLETE);
  });

  it("should return null for terminal states", () => {
    expect(getNextStateForGo(VModelState.COMPLETE)).toBeNull();
    expect(getNextStateForGo(VModelState.BLOCKED)).toBeNull();
  });

  it("should handle special states correctly", () => {
    expect(getNextStateForGo(VModelState.WAITING_FOR_USER)).toBe(VModelState.MODULE_DESIGN);
    expect(getNextStateForGo(VModelState.CONSOLIDATING)).toBe(VModelState.COMPLETE);
    expect(getNextStateForGo(VModelState.PROTOTYPING)).toBe(VModelState.MODULE_DESIGN);
    expect(getNextStateForGo(VModelState.REVIEWING)).toBe(VModelState.COMPLETE);
    expect(getNextStateForGo(VModelState.ARCHIVING)).toBe(VModelState.COMPLETE);
    expect(getNextStateForGo(VModelState.PIVOTING)).toBe(VModelState.REQUIREMENTS);
    expect(getNextStateForGo(VModelState.REFLECTING)).toBe(VModelState.COMPLETE);
  });
});

describe("State Machine - getNextStateForMode", () => {
  it("should use normal mode by default", () => {
    expect(getNextStateForMode(VModelState.REQUIREMENTS, ExecutionMode.NORMAL))
      .toBe(VModelState.REQUIREMENTS_REVIEW);
  });

  it("should use MVP mode when specified", () => {
    expect(getNextStateForMode(VModelState.REQUIREMENTS, ExecutionMode.MVP))
      .toBe(VModelState.SYSTEM_DESIGN);
  });

  it("should use GO mode when specified", () => {
    expect(getNextStateForMode(VModelState.REQUIREMENTS, ExecutionMode.GO))
      .toBe(VModelState.SYSTEM_DESIGN);
  });

  it("should use UX-MVP mode when specified", () => {
    expect(getNextStateForMode(VModelState.REQUIREMENTS, ExecutionMode.UX_MVP))
      .toBe(VModelState.PROTOTYPING);
    expect(getNextStateForMode(VModelState.PROTOTYPING, ExecutionMode.UX_MVP))
      .toBe(VModelState.MODULE_DESIGN);
  });
});

describe("State Machine - getNextState (default)", () => {
  it("should use normal mode as default", () => {
    expect(getNextState(VModelState.REQUIREMENTS)).toBe(VModelState.REQUIREMENTS_REVIEW);
  });
});
