#!/usr/bin/env bash
# Static validation for the vibe-model skill mirror. No dependencies.
# Exits non-zero on the first category of failure; prints all findings.
set -u

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

errors=0
fail() { echo "FAIL: $1"; errors=$((errors + 1)); }

# --- 1. Required files exist and are non-empty -----------------------------
skill_dir="skills/vibe-model"
for f in "$skill_dir/SKILL.md" "$skill_dir/REFERENCE.md"; do
  if [[ ! -s "$f" ]]; then
    fail "$f missing or empty"
  fi
done

# --- 2. Frontmatter: name and description ----------------------------------
fm="$(sed -n '2,/^---$/p' "$skill_dir/SKILL.md" | sed -e '$d')"
# fm now holds the lines between the opening --- and the closing ---.

name="$(printf '%s\n' "$fm" | sed -n 's/^name:[[:space:]]*//p' | head -1 | tr -d '\"')"
dir_name="$(basename "$skill_dir")"
if [[ -z "$name" ]]; then
  fail "SKILL.md frontmatter has no name:"
elif [[ ! "$name" =~ ^[a-z0-9-]+$ ]]; then
  fail "frontmatter name '$name' does not match ^[a-z0-9-]+\$"
elif [[ "$name" != "$dir_name" ]]; then
  fail "frontmatter name '$name' != directory name '$dir_name'"
fi

desc="$(printf '%s\n' "$fm" | sed -n 's/^description:[[:space:]]*//p' | head -1 | tr -d '\"')"
if [[ -z "$desc" ]]; then
  fail "SKILL.md frontmatter has no description:"
elif (( ${#desc} >= 1024 )); then
  fail "frontmatter description is ${#desc} chars (limit 1024)"
fi

# --- 3. Backtick-mention consistency ---------------------------------------
if grep -q '`REFERENCE\.md`' "$skill_dir/SKILL.md" && [[ ! -f "$skill_dir/REFERENCE.md" ]]; then
  fail "SKILL.md mentions \`REFERENCE.md\` but the file is missing"
fi
if [[ -f "$skill_dir/REFERENCE.md" ]] && ! grep -q '`REFERENCE\.md`' "$skill_dir/SKILL.md"; then
  fail "REFERENCE.md exists but SKILL.md never mentions it (agents would never load it)"
fi

# --- 4. Relative .md links resolve -----------------------------------------
# Only [text](path.md) patterns are checked. http(s), anchors and code-span
# paths (runtime paths in the *user's* project) are intentionally skipped.
extract_and_check_links() {
  local file="$1" dir link line
  dir="$(dirname "$file")"
  while IFS= read -r line; do
    line="$(printf '%s\n' "$line" | sed 's/`[^`]*`//g')"  # strip code spans (runtime paths, examples)
    link="$(printf '%s\n' "$line" | sed -n 's/.*](\([^)]*\.md\)).*/\1/p')"
    [[ -z "$link" ]] && continue
    link="${link%%#*}"
    case "$link" in
      http://*|https://*|mailto:*) continue ;;
    esac
    if [[ ! -f "$dir/$link" ]]; then
      fail "$file links to missing file: $link"
    fi
  done < <(grep '\](' "$file")
}
extract_and_check_links "README.md"
extract_and_check_links "$skill_dir/SKILL.md"
extract_and_check_links "$skill_dir/REFERENCE.md"
extract_and_check_links "AGENTS.md"

# --- Result -----------------------------------------------------------------
if (( errors > 0 )); then
  echo "check.sh: $errors error(s)"
  exit 1
fi
echo "check.sh: OK"
