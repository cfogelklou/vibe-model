# V-Model Release Process

This document describes the release process for the V-Model project.

---

## Prerequisites

- Maintainer access to the `cfogelklou/vibe-model` GitHub repository
- npm account with publish permissions for `@vibe-model/cli`
- Bun runtime installed locally
- Git configured with GPG signing (recommended)

---

## Version Bumping

### Semantic Versioning

V-Model follows [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality additions
- **PATCH**: Backwards-compatible bug fixes

### Version Bump Procedure

1. **Update version in package.json**
   ```bash
   cd vibe-model
   bun package bump <major|minor|patch>
   # or manually edit package.json
   ```

2. **Update CHANGELOG.md**
   - Add version header
   - List all changes since last release
   - Categorize: Added, Changed, Deprecated, Removed, Fixed, Security

3. **Commit the version bump**
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: release v1.2.3"
   ```

4. **Create git tag**
   ```bash
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin v1.2.3
   ```

---

## Git Tagging Strategy

### Tag Format

- Format: `v{MAJOR}.{MINOR}.{PATCH}`
- Example: `v1.2.3`
- Always annotated tags: `git tag -a v1.2.3 -m "Release message"`

### Tagging Workflow

```bash
# Create annotated tag
git tag -a v1.2.3 -m "Release v1.2.3: Add feature X, fix bug Y"

# Push tag to remote
git push origin v1.2.3

# List all tags
git tag -l

# Show tag details
git show v1.2.3

# Delete tag (if needed)
git tag -d v1.2.3
git push origin :refs/tags/v1.2.3
```

### Pre-release Tags

For alpha/beta releases:

```bash
# Pre-release version
git tag -a v1.3.0-beta.1 -m "Beta release v1.3.0-beta.1"

# RC version
git tag -a v1.3.0-rc.1 -m "Release candidate v1.3.0-rc.1"
```

---

## npm Publishing Steps

### Pre-Publish Checklist

- [ ] Version bumped in `package.json`
- [ ] CHANGELOG.md updated
- [ ] All tests passing: `bun test`
- [ ] Type checking passes: `bun run typecheck`
- [ ] Build succeeds: `bun run build`
- [ ] Linting passes: `bun run lint`
- [ ] Git tag created and pushed

### Publishing Process

1. **Build the package**
   ```bash
   cd vibe-model
   bun run build
   ```

2. **Dry run (test without publishing)**
   ```bash
   bun publish --dry-run
   ```

3. **Publish to npm**
   ```bash
   # Public release
   bun publish

   # Tagged release (beta, rc, etc.)
   bun publish --tag beta
   ```

4. **Verify publication**
   ```bash
   # Check npm registry
   npm view @vibe-model/cli

   # View specific version
   npm view @vibe-model/cli@1.2.3
   ```

### Post-Publish Steps

1. **Create GitHub Release**
   - Go to: https://github.com/cfogelklou/vibe-model/releases/new
   - Choose tag: `v1.2.3`
   - Release title: `v1.2.3`
   - Copy CHANGELOG.md content to release notes
   - Publish release

2. **Update documentation (if needed)**
   - Update README.md with new features
   - Update USER_GUIDE.md with new commands

3. **Announce release**
   - GitHub release notification
   - Update project documentation

---

## Rollback Procedure

If a release has critical issues:

### npm Rollback

```bash
# Deprecate a specific version
npm deprecate @vibe-model/cli@1.2.3 "Critical bug in feature X. Use 1.2.4 instead."

# Unpublish (only if within 72 hours and absolutely necessary)
npm unpublish @vibe-model/cli@1.2.3
```

### Git Tag Rollback

```bash
# Delete tag locally and remotely
git tag -d v1.2.3
git push origin :refs/tags/v1.2.3

# Create new tag (if needed)
git tag -a v1.2.4 -m "Release v1.2.4: Fixed critical bug"
git push origin v1.2.4
```

---

## Release Checklist

### Before Release
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped
- [ ] Git tag created
- [ ] Tag pushed to remote

### During Release
- [ ] Build successful
- [ ] Dry run successful
- [ ] Published to npm
- [ ] GitHub release created

### After Release
- [ ] Verify npm installation works
- [ ] Verify CLI functionality
- [ ] Update website/docs (if applicable)
- [ ] Monitor for issues

---

## Automated Release (Future)

Consider setting up automated releases using GitHub Actions:

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install Bun
        run: curl -fsSL https://bun.sh/install | bash

      - name: Install dependencies
        run: cd vibe-model && bun install

      - name: Run tests
        run: cd vibe-model && bun test

      - name: Build
        run: cd vibe-model && bun run build

      - name: Publish to npm
        run: cd vibe-model && bun publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Troubleshooting

### npm publish fails with "403 Forbidden"
- Check npm authentication: `npm whoami`
- Verify you have publish permissions for `@vibe-model/cli`
- Check if version already exists: `npm view @vibe-model-cli@VERSION`

### Git tag not showing on GitHub
- Verify tag was pushed: `git push origin --tags`
- Check tag format: should be `v1.2.3` not `1.2.3`

### Build fails during release
- Check Node.js version: `node --version` (should be >=18)
- Clear build cache: `rm -rf node_modules bin && bun install && bun run build`

---

## Related Documentation

- [npm publishing docs](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [GitHub releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [CHANGELOG format](https://keepachangelog.com/)
