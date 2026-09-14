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
