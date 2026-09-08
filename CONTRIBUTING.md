# How to contribute

Firstly thanks for thinking of contributing - the project is [open source](https://opensource.guide/how-to-contribute/) and all contributions are very welcome :slightly_smiling_face: :boom: :thumbsup:

[How to report a bug or suggest a new feature](#how-to-report-a-bug-or-suggest-a-new-feature)

[How to make a contribution](#how-to-make-a-contribution)

[Local development](#local-development)
  * [Visual Studio Code](#visual-studio-code)
  * [Codespaces](#codespaces)
  * [Local development from scratch](#local-development-from-scratch)
    * [Dependencies](#dependencies)
  * [Tools and technologies](#tools-and-technologies)
    * [GitHub Actions](#github-actions)
    * [Go](#go)
[Running the tests](#running-the-tests)

## How to report a bug or suggest a new feature

[Create an issue](https://github.com/agilepathway/label-checker/issues), describing the bug or new feature in as much detail as you can.

## How to make a contribution

  * [Create an issue](https://github.com/agilepathway/label-checker/issues) describing the change you are proposing.
  * [Create a pull request](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests).  The project uses the _[fork and pull model](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/about-collaborative-development-models)_:
    * [Fork the project](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/working-with-forks)
    * Make your changes on your fork
    * Write a [good commit message(s)](https://chris.beams.io/posts/git-commit/) for your changes
    * [Create the pull request for your changes](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/proposing-changes-to-your-work-with-pull-requests)
      * [Update the tests or add new tests](#running-the-tests) to cover the new behaviour.

## Local development

### Visual Studio Code

The easiest way to set up your development environment (unless you have [Codespaces](#codespaces), which is even easier) is to use [Visual Studio Code](https://code.visualstudio.com/)'s [Remote Containers](https://code.visualstudio.com/docs/remote/containers) functionality:
  * [System requirements](https://code.visualstudio.com/docs/remote/containers#_system-requirements)
  * [Fork the project](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/working-with-forks) 
  * [Open the local project folder in a container](https://code.visualstudio.com/docs/remote/containers#_quick-start-open-an-existing-folder-in-a-container)
  * Everything will then be setup for you.  You'll be able to run the tests locally.

### Codespaces

If you have access to [GitHub Codespaces](https://github.com/features/codespaces/) (which allows full remote
development from within your browser) then all you need to do is [fork the project](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/working-with-forks) and open it in Codespaces - easy!

### Local development from scratch

#### Dependencies

* [Go](https://golang.org/)
* [Hoverfly](https://hoverfly.readthedocs.io) (for [running the tests](#running-the-tests))
  1. [Download and install Hoverfly](https://docs.hoverfly.io/en/latest/pages/introduction/downloadinstallation.html)
  2. [Download the Hoverfly default cert](https://raw.githubusercontent.com/SpectoLabs/hoverfly/master/core/cert.pem)
  3. [Add and trust the Hoverfly default cert](https://docs.hoverfly.io/en/latest/pages/tutorials/advanced/configuressl/configuressl.html) [(how to add and trust
   a cert)](https://manuals.gfi.com/en/kerio/connect/content/server-configuration/ssl-certificates/adding-trusted-root-certificates-to-the-server-1605.html)


### Tools and technologies

#### GitHub Actions
  * [General documentation](https://docs.github.com/en/actions)
  * The Label Checker is a [Docker container action](https://docs.github.com/en/actions/creating-actions/creating-a-docker-container-action)

#### Go

Some reasons we chose [Go](https://golang.org/):
  * [readability](https://yourbasic.org/golang/advantages-over-java-python/#code-transparency)
  * [ease of deployment](https://hub.packtpub.com/cloud-native-go-programming/)
  * [backwards compatibility](https://yourbasic.org/golang/advantages-over-java-python/#compatibility)

## Running the tests

As [above](#dependencies), you need [Hoverfly](https://hoverfly.readthedocs.io) to run the tests.

Run the tests:

`go test ./... -v`

Running the tests in GitHub Enterprise Cloud mode (verifying that the label checker 
works properly on [GitHub Enterprise Cloud](https://docs.github.com/en/get-started/onboarding/getting-started-with-github-enterprise-cloud)):

`go test ./... -enterprise-cloud -v`

Running the tests in Github Enterprise Server mode (verifying that the label checker 
works properly on [GitHub Enterprise Server](https://docs.github.com/en/enterprise-server/admin/overview/about-github-enterprise-server)):

`go test ./... -enterprise-server -v`

The tests are [table driven](https://dave.cheney.net/2019/05/07/prefer-table-driven-tests), which is an important concept to know when amending them.

The tests also have an integration mode which makes calls to real external services instead of using Hoverfly to virtualise the service calls.  You do not need to run the tests in integration mode when contributing (they will not pass unless you are a [maintainer](.github/CODEOWNERS) of the project who has the designated GitHub permissions).

If you are a maintainer, and you want to run the integration tests locally, you will need to set the `INPUT_REPO_TOKEN` environment variable, e.g. if using a VS Code Codespace you can run: 

`INPUT_REPO_TOKEN=$GITHUB_TOKEN go test ./... -integration -v`

You can also run the integration tests locally in GitHub Enterprise Cloud mode:

`INPUT_REPO_TOKEN=$GITHUB_TOKEN go test ./... -integration -enterprise-cloud -v`

(we can't run the integration tests in GitHub Enterprise Server mode as that would require having
a real GitHub Enterprise Server, which would be expensive in time and money to maintain)


## Updating dependencies

See the [DEPENDENCIES.md](.github/DEPENDENCIES.md)
