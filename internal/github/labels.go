/*
Package github checks for the presence of GitHub labels
*/
package github

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/shurcooL/githubv4"
	"golang.org/x/oauth2"
)

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

func repositoryOwner() string {
	return strings.Split(os.Getenv("GITHUB_REPOSITORY"), "/")[0]
}

func repositoryName() string {
	return strings.Split(os.Getenv("GITHUB_REPOSITORY"), "/")[1]
}

func pullRequestNumber() int {
	s := strings.Split(os.Getenv("GITHUB_REF"), "/")[2]
	pullRequestNumber, err := strconv.Atoi(s)
	panicIfError((err))

	return pullRequestNumber
}

func pullRequestLabels() []string {
	tokenSource := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: os.Getenv("GITHUB_TOKEN")},
	)
	httpClient := oauth2.NewClient(context.Background(), tokenSource)

	client := githubv4.NewClient(httpClient)

	variables := map[string]interface{}{
		"owner":             githubv4.String(repositoryOwner()),
		"name":              githubv4.String(repositoryName()),
		"pullRequestNumber": githubv4.Int(pullRequestNumber()),
	}

	var query struct {
		Repository struct {
			PullRequest struct {
				Labels struct {
					Nodes []struct {
						Name string
					}
				} `graphql:"labels(first: 100)"`
			} `graphql:"pullRequest(number: $pullRequestNumber)"`
		} `graphql:"repository(owner: $owner, name: $name)"`
	}

	err := client.Query(context.Background(), &query, variables)
	if err != nil {
		fmt.Printf("Error: %v", err)
	}

	labelNodes := query.Repository.PullRequest.Labels.Nodes

	var labels []string

	for i := 0; i < len(labelNodes); i++ {
		labels = append(labels, labelNodes[i].Name)
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
