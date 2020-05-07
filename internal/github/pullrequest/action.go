package pullrequest

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
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
	panicIfError(err)
	defer githubEventJSONFile.Close() //nolint
	byteValue, _ := ioutil.ReadAll(githubEventJSONFile)
	panicIfError(json.Unmarshal(byteValue, &event))

	return event.PullRequestNumber
}

func (action action) token() string {
	return os.Getenv("GITHUB_TOKEN")
}

func (action action) specifiedLabels() []string {
	var specifiedLabels []string

	specifiedJSONLabels := os.Getenv("GITHUB_ACTION_INPUT_LABELS")
	panicIfError(json.Unmarshal([]byte(specifiedJSONLabels), &specifiedLabels))

	return specifiedLabels
}
