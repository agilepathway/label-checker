# Label checker

---

## Rule

A pull request must not have any of the labels specified by `none_of`.

## Example

| Criterion | Labels on the pull request | Outcome |
|---|---|---|
| None of major, minor, patch are present. | (none) | Success |
| None of major, minor, patch are present. | minor | Failure |
| None of major, minor, patch are present. | minor, patch | Failure |
| None of major, minor, patch are present. | major, minor, patch | Failure |

---