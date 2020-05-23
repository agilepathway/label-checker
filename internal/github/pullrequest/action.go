package pullrequest

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/agilepathway/label-checker/internal/error"
)

type action struct {
}

func (action action) repositoryOwner() string {
	return strings.Split(os.Getenv("GITHUB_REPOSITORY"), "/")[0]
}

func (action action) repositoryName() string {
	return strings.Split(os.Getenv("GITHUB_REPOSITORY"), "/")[1]
}

func (action action) pullRequestNumber() int {
	event := struct {
		PullRequestNumber int `json:"number"`
	}{}
	githubEventJSONFile, err := os.Open(filepath.Clean(os.Getenv("GITHUB_EVENT_PATH")))
	error.PanicIfError(err)
	defer githubEventJSONFile.Close() //nolint
	byteValue, _ := ioutil.ReadAll(githubEventJSONFile)
	error.PanicIfError(json.Unmarshal(byteValue, &event))

	return event.PullRequestNumber
}

func (action action) token() string {
	return os.Getenv("GITHUB_TOKEN")
}

func (action action) specifiedLabels() []string {
	var specifiedLabels []string

	specifiedJSONLabels := os.Getenv("REQUIRE_EXACTLY_ONE_OF")
	error.PanicIfError(json.Unmarshal([]byte(specifiedJSONLabels), &specifiedLabels))

	return specifiedLabels
}
