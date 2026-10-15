Active: M1 Phase 3 | Item: delete legacy CLI
Epic: skill-repo-replacement (branch feat/skill-repo-replacement, tag cli-legacy pushed)
Plan: docs/plan-for-skill-repo-replacement.md (SSOT checklist)
Learnings: docs/vibe-model/skill-repo-replacement-learnings.md
Notes: docs/vibe-model/skill-repo-replacement-m1-notes.md
Phase 0/1/2 done (plan approved by user; 3 review subagents ran during planning).
Next: git rm legacy tree (see plan M1 checklist), then import skill files byte-identical.
Waiver: pre-merge artifact deletion replaces archive gate.
Binary recovery: git rev-list cli-legacy -- bin/vibe-model | tail -1 → b0f9425 (blob in history).
