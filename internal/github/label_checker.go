/*
Package github checks pull requests for specified GitHub labels
*/
package github

import (
	"fmt"
	"strings"
)

// CheckLabels checks for the presence of the given GitHub labels
func CheckLabels() {
	var githubAction action
	pullRequest := newPullRequest(githubAction)
	checkLabels(githubAction.specifiedLabels(), pullRequest.labels(), 1)
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

func contains(slice []string, val string) bool {
	for _, item := range slice {
		if item == val {
			return true
		}
	}

	return false
}
