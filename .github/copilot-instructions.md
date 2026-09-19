# Validation

## Test validation

Before committing, run all supported TypeScript test modes:

| GitHub platform | Virtual tests | Integration tests |
| --- | --- | --- |
| Standard GitHub | `node --test test/check_labels.test.ts` | `npm run test:integration` |
| Enterprise Cloud | `TEST_GITHUB_PLATFORM=enterprise-cloud node --test test/check_labels.test.ts` | `TEST_GITHUB_PLATFORM=enterprise-cloud npm run test:integration` |
| Enterprise Server | `TEST_GITHUB_PLATFORM=enterprise-server node --test test/check_labels.test.ts` | Not supported |

Enterprise Server is intentionally virtual-only; do not attempt Enterprise
Server integration tests.

## Biome validation

Use the project-local `@biomejs/biome` version installed from
`package-lock.json`. If the local package is unavailable, install the project
dependencies before running the checks. After every code edit, run
`npm run check`. Run it again before creating a commit. Do not use a globally
installed Biome version.

# Commit messages

Follow [the Chris Beams commit message conventions](https://cbea.ms/git-commit/):

1. [Separate the subject from the body with a blank line](https://cbea.ms/git-commit/#separate).
2. [Limit the subject line to 50 characters](https://cbea.ms/git-commit/#limit-50).
3. [Capitalize the subject line](https://cbea.ms/git-commit/#capitalize).
4. [Do not end the subject line with a period](https://cbea.ms/git-commit/#end).
5. [Use the imperative mood in the subject line](https://cbea.ms/git-commit/#imperative).
6. [Wrap the body at 72 characters](https://cbea.ms/git-commit/#wrap-72).
7. [Use the body to explain what and why versus how](https://cbea.ms/git-commit/#why-not-how).

When a commit pertains to an issue, which it generally will, use this body:
`Read #<issue-number> for context.`

Do not apply convention 7 when using this issue-reference body, because the
issue provides the what and why context.

## Commit message newline handling

When creating or amending a commit, use actual newline characters between the
subject, body, and trailers. Do not put literal escaped sequences such as
`\n\n` in the final commit message.

Prefer a quoted heredoc when creating a correctly formatted message:

```sh
git commit --amend -F - <<'EOF'
Subject line

Body text.

Co-authored-by: ...
EOF
```

Before pushing, verify the final message and check for literal backslash-n
text:

```sh
git log -1 --format='%B'
git log -1 --format='%B' | grep -F '\n'
```

The second command should produce no output. If it does, amend the commit
before pushing.

## Incremental commit handling

Create a new atomic commit for each incremental change, including when
multiple changes relate to the same issue. Do not amend an existing commit and
force-push it to add an incremental change.

The only exception is correcting a badly formatted commit message. For
example, amend and force-push when a commit contains literal `\n\n` text
instead of actual newline characters.

## Pull request workflow

After completing changes, commit them and push the branch. Do not create a pull
request unless a human specifically asks you to do so; by default, a human
creates the pull request.

Every comment posted on a GitHub issue during implementation, review, or
follow-up work must start with the exact prefix `Comment by Copilot: `.

After committing and pushing, comment on the related GitHub issue with a summary
of the completed work. Start the comment with the exact `Comment by Copilot: `
prefix, include the commit SHA and the branch containing that commit as plain
text without backticks, tag `@coderabbitai`, and directly ask
`@coderabbitai` to review that commit on that branch.
