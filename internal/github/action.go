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

	"github.com/agilepathway/label-checker/internal/github/pullrequest"
	"github.com/agilepathway/label-checker/internal/util"
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
	util.PanicIfError(err)
	defer githubEventJSONFile.Close() //nolint
	byteValue, _ := ioutil.ReadAll(githubEventJSONFile)
	util.PanicIfError(json.Unmarshal(byteValue, &event))

	return event.PullRequestNumber
}

func (a Action) token() string {
	return os.Getenv("GITHUB_TOKEN")
}

func (a Action) exactlyOneRequired() []string {
	var specified []string

	specifiedJSONLabels := os.Getenv("REQUIRE_EXACTLY_ONE_OF")
	util.PanicIfError(json.Unmarshal([]byte(specifiedJSONLabels), &specified))

	return specified
}
