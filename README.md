# Label Checker

[![tests](https://github.com/agilepathway/label-checker/actions/workflows/integration_test.yml/badge.svg?branch=master&event=push)](https://github.com/agilepathway/label-checker/actions/workflows/integration_test.yml?query=branch%3Amaster+event%3Apush)
[![Releases](https://img.shields.io/github/release/agilepathway/label-checker/all.svg?logo=github
)](https://github.com/agilepathway/label-checker/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?maxAge=43200)](LICENSE)

---

 **[GitHub Action](https://github.com/features/actions) to check pull requests (PRs) for the presence or absence of specified labels**

---
---

## ⓘ Version 2 migration

- Version 2 of Label Checker is now implemented as a TypeScript/Node 24 GitHub Action.
- Version 2 maintains the same inputs and behaviour, so migrating is simply a matter of changing your `uses` reference to a `v2.x` release (or SHA).
- The previous Docker-based **Version 1 releases are no longer supported and may stop working at any time, so we recommend upgrading as soon as possible.**

---
---

## Why use this label checker?

- We built this label checker back in 2020 because there wasn't (isn't?) another label checker that had all [our 4 check types](#checks) (`one_of`, `none_of`, `all_of`, `any_of`)
  - the popularity of our label checker since then has shown that offering these 4 check types is very useful to many people
- Stable API: the 4 check types are well established now over several years, so the "product" is stable
- Clean, minimal TypeScript implementation, very well tested, with zero runtime dependencies - good from a security and ease of use / maintenance perspective

- [Prefix mode](#match-labels-based-on-prefix): check for the presence or absence of labels beginning with a certain prefix


## Using the Label Checker action

Using this action is as simple as:

1. **create a `.github/workflows` directory** in your repository
2. **create a 
   [YAML](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#about-yaml-syntax-for-workflows) 
   file** in the `.github/workflows` directory (file name can be anything you like, 
   with either a `.yml` or `.yaml` file extension), with this example content:
 
   ```
   ---
   name: Label Checker
   on:
     pull_request:
       types:
         - opened
         - synchronize
         - reopened
         - labeled
         - unlabeled
   
   jobs:
   
     check_labels:
       name: Check labels
       runs-on: ubuntu-latest
       steps:
         - uses: agilepathway/label-checker@v2.0.0  # Change v2.0.0 to a SHA for stronger security
           with:
             one_of: major,minor,patch
             repo_token: ${{ secrets.GITHUB_TOKEN }}
   ```

4. **customise the label checks** in the `with` section of the YAML file to fit your needs 

   (see the [checks](#checks) section below for the different checks you can configure)

## Checks

There are 4 types of label checks available:

- `one_of`  (PRs must have **exactly one** of these labels)

- `none_of` (PRs must have **none** of these labels)

- `all_of`  (PRs must have **all** of these labels)

- `any_of`  (PRs must have **one or more** of these labels)

You can have as many of the checks configured in the same YAML file as you like.

### Examples

- [Semantic versioning](https://semver.org/): `one_of: major,minor,patch`

- Each PR must be a bug or an enhancement: `one_of: bug,enhancement`

- Prohibit certain labels: `none_of: invalid,wontfix,duplicate,question`

- Require each PR to have a certain label: `all_of: enhancement`

  or labels: `all_of: enhancement,reviewed`

- Require each PR to have one or more of these labels: `any_of: documentation,enhancement,bug`

#### Combine multiple checks

  ```
  with:
    one_of: major,minor,patch
    none_of: invalid,wontfix,duplicate,question
    any_of: documentation,enhancement,bug
    repo_token: ${{ secrets.GITHUB_TOKEN }}
  ```

#### Combine multiple checks of the same type

  ```
  jobs:
   
    check_semver_label:
      name: Check for semantic version label
      runs-on: ubuntu-latest
      steps:
        - uses: agilepathway/label-checker@v2.0.0  # Change v2.0.0 to a SHA for stronger security
          with:
            one_of: major,minor,patch
            repo_token: ${{ secrets.GITHUB_TOKEN }}

    check_pull_request_type:
      name: Check for pull request type label
      runs-on: ubuntu-latest
      steps:
        - uses: agilepathway/label-checker@v2.0.0  # Change v2.0.0 to a SHA for stronger security
          with:
            one_of: bug,enhancement
            repo_token: ${{ secrets.GITHUB_TOKEN }}
  ```

## Match labels based on prefix

You can set the label checker to check for the presence or absence of labels starting with the given prefix.

This prefix label checking is a powerful feature that allows pull requests to have 
scoped labels, [similarly to GitLab](https://docs.gitlab.com/ee/user/project/labels.html#scoped-labels).

Set the `prefix_mode` as an input parameter in the 
[`with` section](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepswith): 
`prefix_mode: true` (it is an optional parameter as it defaults to false).

Example:

  ```
  steps:
    - id: prefix_label_check
      uses: agilepathway/label-checker@v2.0.0  # Change v2.0.0 to a SHA for stronger security
      with:
        prefix_mode: true
        one_of: "type:"
        repo_token: ${{ secrets.GITHUB_TOKEN }}
  ```

  This example will pass if there is exactly one label on the pull request starting with `type:`

You can use any string as the prefix (it doesn't need to contain a `:`, that's just one example)

You can use `one_of`, `any_of`, `none_of` when checking prefixes, but you cannot use `all_of` (as `all_of` does not
make sense when checking for labels starting with the given prefix).

You can only specify one prefix at a time. For instance you cannot specify `one_of: "type:","visibility/"`.
You can specify [multiple prefix checks of the same type](#combine-multiple-checks-of-the-same-type) though.

## Allow failure mode

You can set the label checker to not fail the build, even when a label check fails, and then use an
[`if` condition](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsif)
in a subsequent step or job to conditionally do something or not.
For example: check if a pull request has a `preview` label
and then only deploy an ephemeral environment if so.

Set the `allow_failure` mode as an input parameter in the 
[`with` section](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepswith): 
`allow_failure: true` (it is an optional parameter as it defaults to false).

Example:

  ```
  steps:
    - id: preview_label_check
      uses: agilepathway/label-checker@v2.0.0  # Change v2.0.0 to a SHA for stronger security
      with:
        all_of: preview
        repo_token: ${{ secrets.GITHUB_TOKEN }}
        allow_failure: true
    - if: steps.preview_label_check.outputs.label_check == 'success'
      run: echo deploy to ephemeral environment
  ```

The label checker always exposes the `label_check` step output variable,
regardless of whether `allow_failure` is set or not.
The variable has a value of either `success` or `failure` which can then be queried in subsequent steps,
as in the above example.

## GitHub Enterprise

To use this label checker with [GitHub Enterprise](https://github.com/enterprise),
specify the GitHub Enterprise GraphQL URL in an input, e.g. for 
[Enterprise Cloud](https://docs.github.com/en/get-started/onboarding/getting-started-with-github-enterprise-cloud):

   ```
   jobs:
   
     check_labels:
       name: Check labels
       runs-on: ubuntu-latest
       steps:
         - uses: agilepathway/label-checker@v2.0.0  # Change v2.0.0 to a SHA for stronger security
           with:
             github_enterprise_graphql_url: https://api.github.com/graphql
             one_of: major,minor,patch # just an example
             repo_token: ${{ secrets.GITHUB_TOKEN }}
   ```

  or for
  [Enterprise Server](https://docs.github.com/en/enterprise-server/admin/overview/about-github-enterprise-server):

   ```
   jobs:
   
     check_labels:
       name: Check labels
       runs-on: ubuntu-latest
       steps:
         - uses: agilepathway/label-checker@v2.0.0  # Change v2.0.0 to a SHA for stronger security
           with:
             github_enterprise_graphql_url: https://<hostname>/api/graphql
             one_of: major,minor,patch # just an example
             repo_token: ${{ secrets.GITHUB_TOKEN }}
   ```


## Suggestions / bug reports / contributions

The project is [open source](https://opensource.guide/how-to-contribute/) and all contributions are very welcome :slightly_smiling_face: :boom: :thumbsup:

* [How to report a bug or suggest a new feature](CONTRIBUTING.md#how-to-report-a-bug-or-suggest-a-new-feature)

* [How to make a contribution](CONTRIBUTING.md#how-to-make-a-contribution)

* [Local development](CONTRIBUTING.md#local-development)

* [Running the tests](CONTRIBUTING.md#running-the-tests)


## Updating dependencies

See the [DEPENDENCIES.md](.github/DEPENDENCIES.md)

## Reporting security vulnerabilities

As per our [SECURITY.md](SECURITY.md) we welcome and appreciate security vulnerability reports.

Our policy is for vulnerability reports to be [reported privately](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).

To report a new vulnerability:

1. go to the [repository's Security Advisories page](https://github.com/agilepathway/label-checker/security/advisories)
2. click on `Report a vulnerability`

[Tips on creating a great vulnerability report](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/best-practices-for-writing-repository-security-advisories#best-practices)
