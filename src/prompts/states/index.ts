/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * State-specific prompt router.
 * Selects and generates the appropriate prompt based on current V-Model state.
 */

import { VModelState } from "../../types";
import { filterJourneyContext } from "../context/journey-context";
import { filterEpicContext, extractCurrentStoryTitle } from "../context/epic-context";
import { config } from "../../config";
import { promises as fs } from "fs";
import path from "path";

// Import all state prompt functions
import { requirementsPrompt, type RequirementsVars } from "./requirements";
import { systemDesignPrompt, type SystemDesignVars } from "./system-design";
import { archDesignPrompt, type ArchDesignVars } from "./arch-design";
import { moduleDesignPrompt, type ModuleDesignVars } from "./module-design";
import { implementationPrompt, type ImplementationVars } from "./implementation";
import { unitTestPrompt, type UnitTestVars } from "./unit-test";
import { integrationTestPrompt, type IntegrationTestVars } from "./integration-test";
import { systemTestPrompt, type SystemTestVars } from "./system-test";
import { acceptanceTestPrompt, type AcceptanceTestVars } from "./acceptance-test";
import { waitingForUserPrompt, type WaitingForUserVars } from "./waiting-for-user";
import { consolidatingPrompt, type ConsolidatingVars } from "./consolidating";
import { designReviewsPrompt, extractPhaseFromReviewState, type DesignReviewsVars } from "./design-reviews";
import { prototypingPrompt, type PrototypingVars } from "./prototyping";
import { pivotingPrompt, type PivotingVars } from "./pivoting";
import { reflectingPrompt, type ReflectingVars } from "./reflecting";
import { archivingPrompt, type ArchivingVars } from "./archiving";
import { reviewingPrompt, type ReviewingVars } from "./reviewing";

/**
 * Base variables available to all states
 */
export interface BaseStateVars {
  AI_PROVIDER: string;
  JOURNEY_FILE: string;
  JOURNEY_NAME: string;
}

/**
 * Variables for state-specific prompts
 * This is a discriminated union type for type safety
 */
export type StateVars =
  | RequirementsVars
  | SystemDesignVars
  | ArchDesignVars
  | ModuleDesignVars
  | ImplementationVars
  | UnitTestVars
  | IntegrationTestVars
  | SystemTestVars
  | AcceptanceTestVars
  | WaitingForUserVars
  | ConsolidatingVars
  | DesignReviewsVars
  | PrototypingVars
  | PivotingVars
  | ReflectingVars
  | ArchivingVars
  | ReviewingVars;

/**
 * Result from prompt generation
 */
export interface PromptResult {
  prompt: string;
  filteredJourney: string;
  filteredEpic: string;
}

/**
 * Get the appropriate prompt for the current state
 *
 * This is the main entry point for state-specific prompt generation.
 * It filters context and generates the state-specific prompt.
 */
export async function getStatePrompt(
  state: VModelState,
  journeyFile: string,
  journeyContent: string,
  epicFile: string | undefined
): Promise<PromptResult> {
  const journeyName = path.basename(journeyFile, ".journey.md");

  // Filter journey context based on state
  const filteredJourney = filterJourneyContext(journeyContent, state);

  // Load epic content if applicable
  let epicContent = "";
  let epicName = "";
  let epicNumber = "";
  let currentStory = "";
  let storyDesign = "";

  if (epicFile) {
    try {
      epicContent = await fs.readFile(epicFile, "utf-8");
      // Extract epic info
      const epicNameMatch = epicContent.match(/# Epic (E\d+): ([^\n]+)/);
      if (epicNameMatch) {
        epicNumber = epicNameMatch[1];
        epicName = epicNameMatch[2];
      }
      currentStory = extractCurrentStoryTitle(epicContent);

      // Extract current story section for states that need it
      if (
        state === VModelState.MODULE_DESIGN ||
        state === VModelState.IMPLEMENTATION ||
        state === VModelState.UNIT_TEST ||
        state === VModelState.INTEGRATION_TEST ||
        state === VModelState.PROTOTYPING
      ) {
        const storyRegex = /### Story S(\d+): ([^\n]+)\n([\s\S]+?)(?=\n### Story S|\n##[^#]|$)/;
        const storyMatch = epicContent.match(storyRegex);
        if (storyMatch) {
          storyDesign = storyMatch[0];
        }
      }
    } catch {
      // Epic file doesn't exist or can't be read
    }
  }

  // Filter epic context based on state
  const filteredEpic = filterEpicContext(
    epicContent,
    state,
    storyDesign || undefined
  );

  // Load spec content if exists (for REQUIREMENTS, SYSTEM_DESIGN, SYSTEM_TEST, ACCEPTANCE_TEST)
  let specContent = "";
  if (
    [
      VModelState.REQUIREMENTS,
      VModelState.SYSTEM_DESIGN,
      VModelState.SYSTEM_TEST,
      VModelState.ACCEPTANCE_TEST,
      VModelState.CONSOLIDATING,
    ].includes(state)
  ) {
    const specFile = path.join(path.dirname(journeyFile), `${journeyName}.spec.md`);
    try {
      specContent = await fs.readFile(specFile, "utf-8");
    } catch {
      // Spec file doesn't exist
    }
  }

  // Common base variables
  const baseVars: BaseStateVars = {
    AI_PROVIDER: config.aiProvider,
    JOURNEY_FILE: journeyFile,
    JOURNEY_NAME: journeyName,
  };

  // Generate state-specific prompt
  let prompt = "";

  switch (state) {
    case VModelState.REQUIREMENTS:
      prompt = requirementsPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
        SPEC_CONTENT: specContent || undefined,
      });
      break;

    case VModelState.SYSTEM_DESIGN:
      prompt = systemDesignPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
        SPEC_CONTENT: specContent || undefined,
      });
      break;

    case VModelState.ARCH_DESIGN:
      prompt = archDesignPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
        EPIC_CONTENT: filteredEpic,
        EPIC_NAME: epicName,
        EPIC_NUMBER: epicNumber,
      });
      break;

    case VModelState.MODULE_DESIGN:
      prompt = moduleDesignPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
        EPIC_CONTENT: filteredEpic,
        EPIC_NAME: epicName,
        EPIC_NUMBER: epicNumber,
        CURRENT_STORY: currentStory,
        STORY_CONTENT: storyDesign,
      });
      break;

    case VModelState.IMPLEMENTATION:
      prompt = implementationPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
        EPIC_CONTENT: filteredEpic,
        EPIC_NAME: epicName,
        EPIC_NUMBER: epicNumber,
        CURRENT_STORY: currentStory,
        STORY_DESIGN: storyDesign,
      });
      break;

    case VModelState.UNIT_TEST:
      prompt = unitTestPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
        EPIC_NAME: epicName,
        EPIC_NUMBER: epicNumber,
        CURRENT_STORY: currentStory,
        STORY_DESIGN: storyDesign,
      });
      break;

    case VModelState.INTEGRATION_TEST:
      prompt = integrationTestPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
        EPIC_NAME: epicName,
        EPIC_NUMBER: epicNumber,
        CURRENT_STORY: currentStory,
        STORY_DESIGN: storyDesign,
        EPIC_CONTENT: filteredEpic,
      });
      break;

    case VModelState.SYSTEM_TEST:
      prompt = systemTestPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
        SPEC_CONTENT: specContent,
      });
      break;

    case VModelState.ACCEPTANCE_TEST:
      prompt = acceptanceTestPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
        SPEC_CONTENT: specContent,
      });
      break;

    case VModelState.WAITING_FOR_USER:
      prompt = waitingForUserPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
      });
      break;

    case VModelState.CONSOLIDATING:
      prompt = consolidatingPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
        SPEC_CONTENT: specContent || undefined,
      });
      break;

    case VModelState.REQUIREMENTS_REVIEW:
    case VModelState.SYSTEM_DESIGN_REVIEW:
    case VModelState.ARCH_DESIGN_REVIEW:
    case VModelState.MODULE_DESIGN_REVIEW: {
      const phase = extractPhaseFromReviewState(state);
      if (phase) {
        prompt = designReviewsPrompt({
          ...baseVars,
          JOURNEY_CONTENT: filteredJourney,
          CONSULT_GEMINI: config.consultGemini,
          PHASE: phase,
        });
      }
      break;
    }

    case VModelState.PROTOTYPING:
      prompt = prototypingPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
        EPIC_NAME: epicName,
        EPIC_NUMBER: epicNumber,
        CURRENT_STORY: currentStory,
        STORY_DESIGN: storyDesign,
      });
      break;

    case VModelState.PIVOTING:
      prompt = pivotingPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
      });
      break;

    case VModelState.REFLECTING:
      prompt = reflectingPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
      });
      break;

    case VModelState.ARCHIVING:
      prompt = archivingPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
      });
      break;

    case VModelState.REVIEWING:
      prompt = reviewingPrompt({
        ...baseVars,
        JOURNEY_CONTENT: filteredJourney,
      });
      break;

    case VModelState.COMPLETE:
    case VModelState.BLOCKED:
      // Terminal states - minimal prompt
      prompt = `You are in terminal state: ${state}

## Your Journey

${filteredJourney}

No further action required.
`;
      break;

    default:
      // Unknown state - use generic prompt
      prompt = `Unknown state: ${state}

## Your Journey

${filteredJourney}

Please check the journey state and transition to a valid state.
`;
  }

  return {
    prompt,
    filteredJourney,
    filteredEpic,
  };
}

// Re-export all state types
export type {
  RequirementsVars,
  SystemDesignVars,
  ArchDesignVars,
  ModuleDesignVars,
  ImplementationVars,
  UnitTestVars,
  IntegrationTestVars,
  SystemTestVars,
  AcceptanceTestVars,
  WaitingForUserVars,
  ConsolidatingVars,
  DesignReviewsVars,
  PrototypingVars,
  PivotingVars,
  ReflectingVars,
  ArchivingVars,
  ReviewingVars,
};

// Re-export phase extraction utility
export { extractPhaseFromReviewState } from "./design-reviews";
