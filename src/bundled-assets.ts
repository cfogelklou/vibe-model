/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Bundled assets that are embedded into the executable at build time.
 * These files are extracted to the working directory when needed.
 */

/**
 * vibe-model.md - The complete V-Model protocol specification
 * This file is bundled at build time and extracted to ./vibe-model/vibe-model.md on journey init
 */
import VIBE_MODEL_MD from "../vibe-model.md" with { type: "text" };
export { VIBE_MODEL_MD };
