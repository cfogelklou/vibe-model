/**
 * vibe-model - V-Model autonomous R&D agent
 * Copyright (c) 2026 Applicaudia AB (Chris Fogelklou, but mostly Claude Code)
 * Licensed under the MIT License
 */

/**
 * Bundled assets that are embedded into the executable at build time.
 * These files are extracted to the working directory when needed.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get the directory of this file (works in both dev and compiled scenarios)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * vibe-model.md - The complete V-Model protocol specification
 * This file is bundled at build time and extracted to ./vibe-model/vibe-model.md on journey init
 */
export const VIBE_MODEL_MD = readFileSync(
  join(__dirname, "../vibe-model.md"),
  "utf-8"
);
