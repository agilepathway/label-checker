/*
Package github encapsulates GitHub Action data and behaviour
*/
package github

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/agilepathway/label-checker/internal/error/panic"
	"github.com/agilepathway/label-checker/internal/github/pullrequest"
)

// Action encapsulates the Label Checker GitHub Action
type Action struct {
	successMsg string
	failMsg    string
}

// CheckLabels checks pull requests for the presence or absence of specified GitHub labels
func (a *Action) CheckLabels() error {
	fmt.Println("Checking GitHub labels ...")

	pr := pullrequest.New(a.repositoryOwner(), a.repositoryName(), a.pullRequestNumber(), a.token(), a.enterpriseEndpoint())

	a.runCheck(pr.Labels.HasExactlyOneOf, a.exactlyOneRequired)
	a.runCheck(pr.Labels.HasNoneOf, a.noneRequired)
	a.runCheck(pr.Labels.HasAllOf, a.allRequired)
	a.runCheck(pr.Labels.HasAnyOf, a.anyRequired)

	if len(a.successMsg) > 0 {
		fmt.Println(a.trimTrailingNewLine(a.successMsg))
	}

	if len(a.failMsg) > 0 {
		return errors.New(a.trimTrailingNewLine(a.failMsg))
	}

	return nil
}

func (a *Action) trimTrailingNewLine(input string) string {
	return strings.TrimSuffix(input, "\n")
}

type check func([]string) (bool, string)

type specified func() []string

func (a *Action) runCheck(chk check, specified specified) {
	if len(specified()) > 0 {
		valid, message := chk(specified())
		if valid {
			a.successMsg += message + "\n"
		} else {
			a.failMsg += message + "\n"
		}
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
		PullRequestNumber int `json:"number"`
	}{}
	githubEventJSONFile, err := os.Open(filepath.Clean(os.Getenv("GITHUB_EVENT_PATH")))
	panic.IfError(err)
	defer githubEventJSONFile.Close() //nolint
	byteValue, _ := ioutil.ReadAll(githubEventJSONFile)
	panic.IfError(json.Unmarshal(byteValue, &event))

	return event.PullRequestNumber
}

func (a *Action) token() string {
	return os.Getenv("INPUT_REPO_TOKEN")
}

func (a *Action) enterpriseEndpoint() string {
	return os.Getenv("GITHUB_GRAPHQL_URL")
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
