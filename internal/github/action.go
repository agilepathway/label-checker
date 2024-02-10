/*
Package github encapsulates GitHub Action data and behaviour
*/
package github

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/agilepathway/label-checker/internal/error/panic"
	"github.com/agilepathway/label-checker/internal/github/pullrequest"
)

// Action encapsulates the Label Checker GitHub Action.
type Action struct {
	Stdout     io.Writer // writer to write stdout messages to
	Stderr     io.Writer // writer to write stderr messages to
	successMsg string
	failMsg    string
}

// CheckLabels checks pull requests for the specified GitHub labels.
// It returns the exit code that callers should exit with - 0 if the
// checks were successful and 1 if they failed.
func (a *Action) CheckLabels(stdout, stderr io.Writer) int {
	a.Stdout = stdout
	a.Stderr = stderr
	fmt.Fprintln(a.Stdout, "Checking GitHub labels ...")

	pr := pullrequest.New(
		a.repositoryOwner(),
		a.repositoryName(),
		a.pullRequestNumber(),
		a.token(),
		a.enterpriseEndpoint(),
	)

	a.runCheck(pr.Labels.HasExactlyOneOf, a.exactlyOneRequired(), a.prefixMode())
	a.runCheck(pr.Labels.HasNoneOf, a.noneRequired(), a.prefixMode())
	a.runCheck(pr.Labels.HasAllOf, a.allRequired(), a.prefixMode())
	a.runCheck(pr.Labels.HasAnyOf, a.anyRequired(), a.prefixMode())

	if len(a.successMsg) > 0 {
		fmt.Fprintln(a.Stdout, a.trimTrailingNewLine(a.successMsg))
	}

	if len(a.failMsg) > 0 {
		return a.handleFailure()
	}

	a.outputResult("success")

	return 0
}

// handleFailure returns the exit code status for the
// GitHub Action in the event of the label checks failing.
func (a *Action) handleFailure() int {
	a.outputResult("failure")
	err := errors.New(a.trimTrailingNewLine(a.failMsg))
	fmt.Fprintln(a.Stderr, "::error::", err)

	if a.allowFailure() {
		return 0
	}

	return 1
}

func (a *Action) trimTrailingNewLine(input string) string {
	return strings.TrimSuffix(input, "\n")
}

type check func([]string, bool) (bool, string)

func (a *Action) runCheck(chk check, specified []string, prefixMode bool) {
	if len(specified) == 0 {
		return
	}

	if prefixMode && len(specified) > 1 {
		a.failMsg += "Currently the label checker only supports checking with one prefix, not multiple."

		return
	}

	valid, message := chk(specified, prefixMode)

	if valid {
		a.successMsg += message + "\n"
	} else {
		a.failMsg += message + "\n"
	}
}

func (a *Action) repositoryOwner() string {
	return strings.Split(os.Getenv("GITHUB_REPOSITORY"), "/")[0]
}

func (a *Action) repositoryName() string {
	return strings.Split(os.Getenv("GITHUB_REPOSITORY"), "/")[1]
}

func (a *Action) pullRequestNumber() int {
	event := struct {
		PullRequest struct {
			Number int `json:"number"`
		} `json:"pull_request"`
	}{}
	githubEventJSONFile, err := os.Open(filepath.Clean(os.Getenv("GITHUB_EVENT_PATH")))
	panic.IfError(err)
	defer githubEventJSONFile.Close() //nolint
	byteValue, _ := io.ReadAll(githubEventJSONFile)
	panic.IfError(json.Unmarshal(byteValue, &event))

	return event.PullRequest.Number
}

func (a *Action) outputResult(result string) {
	const UserReadWriteFilePermission = 0o644

	labelCheckOutput := fmt.Sprintf("label_check=%s", result)
	gitHubOutputFileName := filepath.Clean(os.Getenv("GITHUB_OUTPUT"))
	githubOutputFile, err := os.OpenFile(gitHubOutputFileName, os.O_APPEND|os.O_WRONLY, UserReadWriteFilePermission) //nolint:gosec,lll
	panic.IfError(err)
	_, err = githubOutputFile.WriteString(labelCheckOutput)

	if err != nil {
		closingErr := githubOutputFile.Close()

		panic.IfError(err)
		panic.IfError(closingErr)
	}

	err = githubOutputFile.Close()
	panic.IfError(err)
}

func (a *Action) token() string {
	return os.Getenv("INPUT_REPO_TOKEN")
}

func (a *Action) allowFailure() bool {
	return os.Getenv("INPUT_ALLOW_FAILURE") == "true"
}

func (a *Action) prefixMode() bool {
	return os.Getenv("INPUT_PREFIX_MODE") == "true"
}

func (a *Action) enterpriseEndpoint() string {
	return os.Getenv("INPUT_GITHUB_ENTERPRISE_GRAPHQL_URL")
}

func (a *Action) exactlyOneRequired() []string {
	return a.getLabelsFromEnvVar("INPUT_ONE_OF")
}

func (a *Action) noneRequired() []string {
	return a.getLabelsFromEnvVar("INPUT_NONE_OF")
}

func (a *Action) allRequired() []string {
	return a.getLabelsFromEnvVar("INPUT_ALL_OF")
}

func (a *Action) anyRequired() []string {
	return a.getLabelsFromEnvVar("INPUT_ANY_OF")
}

func (a *Action) getLabelsFromEnvVar(envVar string) []string {
	specifiedLabels, present := os.LookupEnv(envVar)
	if present && (len(strings.TrimSpace(specifiedLabels)) > 0) {
		return strings.Split(specifiedLabels, ",")
	}

	return []string{}
}
