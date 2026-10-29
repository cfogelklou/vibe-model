# Security Policy

## Supported Versions

Currently, only the latest version of vibe-model receives security updates.

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | :white_check_mark: Yes |
| < 1.0   | :x: No               |

## Reporting a Vulnerability

If you discover a security vulnerability in vibe-model, please report it responsibly.

### How to Report

Send an email to: **chris@applicaudia.com**

Please include:
- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes (if available)

### What to Expect

- You will receive an acknowledgment within 48 hours
- We will investigate the issue promptly
- We will provide a timeline for the fix
- You will be notified when the fix is released

### Disclosure Policy

- We will disclose vulnerabilities once a fix is released
- Credit will be given to reporters (unless you wish to remain anonymous)
- We aim to release patches within 7 days of confirmation for critical issues

## Security Best Practices

### For Users

1. **Keep dependencies updated**:
   ```bash
   bun update
   ```

2. **Review permissions**: The tool requires access to:
   - Your project directory
   - Git commands
   - AI provider APIs (Claude Code CLI or Gemini CLI)

3. **Protect API keys**: Never commit API keys to your repository

4. **Review generated code**: Always review AI-generated code before committing

### For Developers

1. **Input validation**: Validate all user inputs and AI responses
2. **Code injection**: Be careful with file operations and command execution
3. **Dependency audits**: Regularly audit dependencies for vulnerabilities:
   ```bash
   bun audit
   ```
4. **Secrets management**: Never log or expose sensitive information

## Known Security Considerations

### AI Command Execution

vibe-model executes AI-generated commands in your shell. This is intentional for autonomous development but carries inherent risks:

- Commands run with your user permissions
- AI may suggest destructive operations (with git checkpointing for rollback)
- Always reviewjourney files to understand what was executed

### File Operations

The tool performs extensive file operations:
- Files are created, modified, and deleted based on AI decisions
- Git checkpoints provide rollback capability
- Review git history to understand changes

### External AI Providers

The tool integrates with external AI services:
- Claude Code CLI or Gemini CLI must be installed separately
- AI conversations may include project context
- Review your AI provider's privacy policy

## Security Features

### Git Checkpointing

Automatic git checkpointing provides a safety net:
- Checkpoints created before major changes
- Easy rollback: `./vibe-model/bin/vibe-model rollback [checkpoint_id]`
- Review checkpoints: `./vibe-model/bin/vibe-model list-checkpoints`

### Read-Only Mode

For testing without making changes:
```bash
# Set dry-run mode (future feature)
export VIBE_MODEL_DRY_RUN=true
```

## Vulnerability Response Process

1. **Report received**: Acknowledge receipt within 48 hours
2. **Investigation**: Confirm and assess severity within 3 days
3. **Fix development**: Develop patch based on severity
   - Critical: 48 hours
   - High: 7 days
   - Medium: 14 days
   - Low: Next release
4. **Release**: Deploy fix with security advisory
5. **Verification**: Reporter confirms fix

## Severity Definitions

| Severity | Description                          | Example                           |
|----------|--------------------------------------|-----------------------------------|
| Critical | Remote code execution, data loss     | Arbitrary command execution       |
| High     | Local privilege escalation, major leak | Sensitive data exposure         |
| Medium   | Limited impact, requires user action | Information disclosure           |
| Low      | Minor issues, hard to exploit        | Typos in error messages          |

## Security Advisories

Security advisories will be published on GitHub with:
- CVE identifier (if applicable)
- Severity rating
- Impact assessment
- Mitigation steps
- Patch information

## Contact

For security-related inquiries:
- **Email**: chris@applicaudia.com
- **GitHub Security**: Use the "Report a vulnerability" link on GitHub

Thank you for helping keep vibe-model secure!
