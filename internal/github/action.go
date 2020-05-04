package github

import (
	"encoding/json"
	"os"
	"strconv"
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
	s := strings.Split(os.Getenv("GITHUB_REF"), "/")[2]
	pullRequestNumber, err := strconv.Atoi(s)
	panicIfError((err))

	return pullRequestNumber
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
