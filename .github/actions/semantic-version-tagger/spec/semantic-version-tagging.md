# Semantic Version Tagging

---

## Rule

Given a new patch-level semantic version to be applied to a given new commit, a new patch tag is created for that commit and the major, minor and latest tags are moved to point to the new commit too.

## Example

A new `v2.0.1` version and a new commit SHA `a1b2c3d4e5f67890abcdef1234567890abcdef12`

| Tag | Before | After |
|---|---|---|
| `v2` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v2.0` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v2.0.0` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` |
| `v2.0.1` | — | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `latest` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |

---

## Rule

Given a new minor-level semantic version to be applied to a given new commit, a new minor and patch-level tag are created for that commit, and the major and latest tags are moved to point to the new commit too.

## Example

A new `v2.1.0` version and a new commit SHA `b2c3d4e5f67890abcdef1234567890abcdef123`

| Tag | Before | After |
|---|---|---|
| `v2` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` | `b2c3d4e5f67890abcdef1234567890abcdef123` |
| `v2.0` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v2.0.0` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` |
| `v2.0.1` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v2.1` | — | `b2c3d4e5f67890abcdef1234567890abcdef123` |
| `v2.1.0` | — | `b2c3d4e5f67890abcdef1234567890abcdef123` |
| `latest` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` | `b2c3d4e5f67890abcdef1234567890abcdef123` |

---

## Rule

Given a new major-level semantic version to be applied to a given new commit, a new major, minor and patch-level tag are created for that commit, and the latest tag is moved to point to the new commit too.

## Example

A new `v3.0.0` version and a new commit SHA `c3d4e5f67890abcdef1234567890abcdef1234`

| Tag | Before | After |
|---|---|---|
| `v2` | `b2c3d4e5f67890abcdef1234567890abcdef123` | `b2c3d4e5f67890abcdef1234567890abcdef123` |
| `v2.0` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v2.1` | `b2c3d4e5f67890abcdef1234567890abcdef123` | `b2c3d4e5f67890abcdef1234567890abcdef123` |
| `v2.0.0` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` |
| `v2.0.1` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v2.1.0` | `b2c3d4e5f67890abcdef1234567890abcdef123` | `b2c3d4e5f67890abcdef1234567890abcdef123` |
| `v3` | — | `c3d4e5f67890abcdef1234567890abcdef1234` |
| `v3.0` | — | `c3d4e5f67890abcdef1234567890abcdef1234` |
| `v3.0.0` | — | `c3d4e5f67890abcdef1234567890abcdef1234` |
| `latest` | `b2c3d4e5f67890abcdef1234567890abcdef123` | `c3d4e5f67890abcdef1234567890abcdef1234` |

---

## Rule

Given a new patch-level semantic version to be applied to a given new commit, if any of the semantic version tags expected to already be present on an earlier commit are missing then they are created rather than moved.

## Example

Project only has patch-level tags in existence before now. A new `v2.0.1` version and a new commit SHA `a1b2c3d4e5f67890abcdef1234567890abcdef12`, with no major, minor and latest tags already existing.

| Tag | Before | After |
|---|---|---|
| `v2` | — | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v2.0` | — | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v2.0.0` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` |
| `v2.0.1` | — | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `latest` | — | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |

## Example

The very first semantic `v0.0.1` version for the repo and a new commit SHA `a1b2c3d4e5f67890abcdef1234567890abcdef12`, with no previous semantic version tags existing.

| Tag | Before | After |
|---|---|---|
| `v0` | — | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v0.0` | — | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v0.0.1` | — | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `latest` | — | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |

## Example

The project adopts the `latest` tag for the first time. A new `v2.0.1` version and a new commit SHA `a1b2c3d4e5f67890abcdef1234567890abcdef12`, with no `latest` tag already existing.

| Tag | Before | After |
|---|---|---|
| `v2` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v2.0` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v2.0.0` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` |
| `v2.0.1` | — | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `latest` | — | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |

---

## Rule

**The new version tag must not already exist.**

## Example

A new `v2.0.1` version and a new commit SHA `a1b2c3d4e5f67890abcdef1234567890abcdef12`, where the `v2.0.1` tag already exists:

| Tag | Before | After | Result |
|---|---|---|---|
| `v2.0.1` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | **Error** |

---

## Rule

If a tag exists and is in scope to be moved to the new commit, it is moved regardless of which commit it currently points to.

## Example

The `v2` tag currently (wrongly) points to the commit tagged `v1.0.0`. A new `v2.0.1` version and a new commit SHA `a1b2c3d4e5f67890abcdef1234567890abcdef12`:

| Tag | Before | After |
|---|---|---|
| `v1.0.0` | `9e8d7c6b5a4f3210fedcba9876543210fedcba98` | `9e8d7c6b5a4f3210fedcba9876543210fedcba98` |
| `v2` | `9e8d7c6b5a4f3210fedcba9876543210fedcba98` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v2.0` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `v2.0.0` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` |
| `v2.0.1` | — | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |
| `latest` | `7f8c9b2a5d4e1f0a3b6c8e9f2a1b4c5d6e7f8a9b` | `a1b2c3d4e5f67890abcdef1234567890abcdef12` |

---