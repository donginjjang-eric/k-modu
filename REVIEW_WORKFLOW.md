# K-MODU Review Workflow

Use this workflow before publishing any visible site change.

## Flow

1. Make the local edit.
2. Run `powershell -ExecutionPolicy Bypass -File scripts/preflight.ps1`.
3. Ask a review agent to inspect the diff before commit.
4. Fix review findings.
5. Run the preflight script again.
6. Commit and push only after the checks pass.

## Review Agent Scope

The review agent should check:

- Mobile and desktop layout risk.
- Broken links or missing asset references.
- CSS changes that leak across unrelated pages.
- Duplicate or unused markup introduced by the change.
- Whether the public `k-modu` folder and local preview folder are in sync when both are being used.

## Publish Rule

Do not push directly after editing. Push only after:

- Preflight passes.
- Review findings are handled or explicitly accepted.
- The final diff only contains files related to the requested change.
