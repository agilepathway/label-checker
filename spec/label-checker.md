# Label checker

---

## Rule

A pull request must not have any of the labels specified by `none_of`.

### Example

| Criterion | Labels on the pull request | Outcome |
|---|---|---|
| None of major, minor, patch are present. | (none) | Success |
| None of major, minor, patch are present. | minor | Failure |
| None of major, minor, patch are present. | minor, patch | Failure |
| None of major, minor, patch are present. | major, minor, patch | Failure |

---

## Rule

A pull request must have exactly one of the labels specified by `one_of`.

### Example

| Criterion | Labels on the pull request | Outcome |
|---|---|---|
| Exactly one of major, minor, patch is present. | (none) | Failure |
| Exactly one of major, minor, patch is present. | minor | Success |
| Exactly one of major, minor, patch is present. | minor, patch | Failure |
| Exactly one of major, minor, patch is present. | major, minor, patch | Failure |

---

## Rule

A pull request must have all of the labels specified by `all_of`.

### Example

| Criterion | Labels on the pull request | Outcome |
|---|---|---|
| All of major, minor, patch are present. | (none) | Failure |
| All of major, minor, patch are present. | minor | Failure |
| All of major, minor, patch are present. | minor, patch | Failure |
| All of major, minor, patch are present. | major, minor, patch | Success |

---

## Rule

A pull request must have at least one of the labels specified by `any_of`.

### Example

| Criterion | Labels on the pull request | Outcome |
|---|---|---|
| At least one of major, minor, patch is present. | (none) | Failure |
| At least one of major, minor, patch is present. | minor | Success |
| At least one of major, minor, patch is present. | minor, patch | Success |
| At least one of major, minor, patch is present. | major, minor, patch | Success |

---

## Rule

The label checker can combine multiple checks together.

### Example

2 checks combined:

| Criterion 1 | Criterion 2 | Labels on the pull request | Criterion 1 outcome | Criterion 2 outcome | Overall outcome |
|---|---|---|---|---|---|
| None of major, minor, patch are present. | Exactly one of major, minor, patch is present. | (none) | Success | Failure | Failure |
| None of major, minor, patch are present. | Exactly one of major, minor, patch is present. | minor | Failure | Success | Failure |
| None of major, minor, patch are present. | Exactly one of major, minor, patch is present. | minor, patch | Failure | Failure | Failure |
| None of major, minor, patch are present. | Exactly one of major, minor, patch is present. | major, minor, patch | Failure | Failure | Failure |

### Example

3 checks combined:

| Criterion 1 | Criterion 2 | Criterion 3 | Labels on the pull request | Criterion 1 outcome | Criterion 2 outcome | Criterion 3 outcome | Overall outcome |
|---|---|---|---|---|---|---|---|
| None of major, minor, patch are present. | Exactly one of major, minor, patch is present. | All of major, minor, patch are present. | (none) | Success | Failure | Failure | Failure |
| None of major, minor, patch are present. | Exactly one of major, minor, patch is present. | All of major, minor, patch are present. | minor | Failure | Success | Failure | Failure |
| None of major, minor, patch are present. | Exactly one of major, minor, patch is present. | All of major, minor, patch are present. | minor, patch | Failure | Failure | Failure | Failure |
| None of major, minor, patch are present. | Exactly one of major, minor, patch is present. | All of major, minor, patch are present. | major, minor, patch | Failure | Failure | Success | Failure |

---