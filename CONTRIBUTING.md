# How to contribute

Firstly thanks for thinking of contributing - the project is [open source](https://opensource.guide/how-to-contribute/) and all contributions are very welcome :slightly_smiling_face: :boom: :thumbsup:

[How to report a bug or suggest a new feature](#how-to-report-a-bug-or-suggest-a-new-feature)

[How to make a contribution](#how-to-make-a-contribution)

[Local development](#local-development)

[Running the tests](#running-the-tests)

[Updating dependencies](#updating-dependencies)

## How to report a bug or suggest a new feature

[Create an issue](https://github.com/agilepathway/label-checker/issues), describing the bug or new feature in as much detail as you can.

## How to make a contribution

  * [Create a pull request](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests). The project uses the _[fork and pull model](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/about-collaborative-development-models)_:
    * [Fork the project](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/working-with-forks)
    * Make your changes on your fork
    * Write commit messages that follow the [Chris Beams commit message conventions](https://cbea.ms/git-commit/):
      1. [Separate the subject from the body with a blank line](https://cbea.ms/git-commit/#separate).
      2. [Limit the subject line to 50 characters](https://cbea.ms/git-commit/#limit-50).
      3. [Capitalize the subject line](https://cbea.ms/git-commit/#capitalize).
      4. [Do not end the subject line with a period](https://cbea.ms/git-commit/#end).
      5. [Use the imperative mood in the subject line](https://cbea.ms/git-commit/#imperative).
      6. [Wrap the body at 72 characters](https://cbea.ms/git-commit/#wrap-72).
      7. [Use the body to explain what and why versus how](https://cbea.ms/git-commit/#why-not-how).
      * When a commit pertains to an issue, which it generally will, use this body: `Read #<issue-number> for context.`
      * Do not apply convention 7 when using this issue-reference body, because the issue provides the what and why context.
    * [Create the pull request for your changes](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/proposing-changes-to-your-work-with-issues-and-pull-requests)
      * [Update the tests or add new tests](#running-the-tests) to cover the new behaviour.

## Local development

The project is a TypeScript GitHub Action and requires Node.js 24 or later.

For the simplest development setup, open the repository in a
[GitHub Codespace](https://github.com/features/codespaces).

## Running the tests

### Virtual tests

Run the standard virtual tests:

`node --test test/check_labels.test.ts`

Run the virtual tests in GitHub Enterprise Cloud mode:

`TEST_GITHUB_PLATFORM=enterprise-cloud node --test test/check_labels.test.ts`

Run the virtual tests in GitHub Enterprise Server mode:

`TEST_GITHUB_PLATFORM=enterprise-server node --test test/check_labels.test.ts`

### Integration tests

Integration tests make calls to real external services instead of using the
virtual test server. You do not need to run the integration tests when
contributing; they require GitHub permissions that are only available to
maintainers.

Maintainers can run the standard integration tests locally with:

`GITHUB_TOKEN=<token> npm run test:integration`

## Updating dependencies

See the [DEPENDENCIES.md](.github/DEPENDENCIES.md)
