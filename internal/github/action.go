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
}

// ValidateLabels checks for the presence of the given GitHub labels
func (a Action) ValidateLabels() error {
	fmt.Println("Checking GitHub labels ...")

	pr := pullrequest.New(a.repositoryOwner(), a.repositoryName(), a.pullRequestNumber(), a.token())

	valid, message := pr.Labels.HasExactlyOneOf(a.exactlyOneRequired())
	if !valid {
		return errors.New(message)
	}

	fmt.Println(message)

	return nil
}

func (a Action) repositoryOwner() string {
	return strings.Split(os.Getenv("GITHUB_REPOSITORY"), "/")[0]
}

func (a Action) repositoryName() string {
	return strings.Split(os.Getenv("GITHUB_REPOSITORY"), "/")[1]
}

func (a Action) pullRequestNumber() int {
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

func (a Action) token() string {
	return os.Getenv("GITHUB_TOKEN")
}

func (a Action) exactlyOneRequired() []string {
	var specified []string

	specifiedJSONLabels := os.Getenv("REQUIRE_EXACTLY_ONE_OF")
	panic.IfError(json.Unmarshal([]byte(specifiedJSONLabels), &specified))

	return specified
}
