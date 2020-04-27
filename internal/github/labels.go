/*
Package github checks for the presence of GitHub labels
*/
package github

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strings"
)

type event struct {
	PullRequest pullRequest `json:"pull_request"`
}

type pullRequest struct {
	Labels []label `json:"labels"`
}

type label struct {
	Name string `json:"name"`
}

// CheckLabels checks for the presence of the given GitHub labels
func CheckLabels() {
	checkLabels(specifiedLabels(), pullRequestLabels(), 1)
}

func checkLabels(specifiedLabels []string, pullRequestLabels []string, allowedNumberOfLabels int) {
	counter := 0

	for i := 0; i < len(pullRequestLabels); i++ {
		if contains(specifiedLabels, pullRequestLabels[i]) {
			counter++
		}
	}

	if counter != allowedNumberOfLabels {
		panic(`Label check failed: required one of ` + strings.Join(specifiedLabels, ", "))
	}

	fmt.Println(`Label check successful: required one of ` +
		strings.Join(specifiedLabels, ", ") + `, and found: ` + pullRequestLabels[0])
}

func specifiedLabels() []string {
	var specifiedLabels []string

	specifiedJSONLabels := os.Getenv("GITHUB_ACTION_INPUT_LABELS")
	panicIfError(json.Unmarshal([]byte(specifiedJSONLabels), &specifiedLabels))

	return specifiedLabels
}

func pullRequestLabels() []string {
	gitHubEventJSONFile, err := os.Open(filepath.Clean(os.Getenv("GITHUB_EVENT_PATH")))
	panicIfError(err)

	defer gitHubEventJSONFile.Close() //nolint

	byteValue, _ := ioutil.ReadAll(gitHubEventJSONFile)

	var event event

	panicIfError(json.Unmarshal(byteValue, &event))

	var labels []string

	for i := 0; i < len(event.PullRequest.Labels); i++ {
		labels = append(labels, event.PullRequest.Labels[i].Name)
	}

	return labels
}

func panicIfError(err error) {
	if err != nil {
		log.Fatalf("Error that we cannot recover from, %v", err)
	}
}

func contains(slice []string, val string) bool {
	for _, item := range slice {
		if item == val {
			return true
		}
	}

	return false
}
