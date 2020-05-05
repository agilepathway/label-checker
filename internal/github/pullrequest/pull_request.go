package pullrequest

import (
	"context"

	"github.com/shurcooL/githubv4"
	"golang.org/x/oauth2"
)

type pullRequest struct {
	repositoryOwner string
	repository      string
	number          int
	apiClient       *githubv4.Client
}

func new(action action) *pullRequest {
	return &pullRequest{action.repositoryOwner(),
		action.repositoryName(),
		action.pullRequestNumber(),
		apiClient(action.token())}
}

func (pr pullRequest) labels() []string {
	variables := map[string]interface{}{
		"owner":             githubv4.String(pr.repositoryOwner),
		"name":              githubv4.String(pr.repository),
		"pullRequestNumber": githubv4.Int(pr.number),
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

	err := pr.apiClient.Query(context.Background(), &query, variables)
	panicIfError(err)

	labelNodes := query.Repository.PullRequest.Labels.Nodes

	var labels []string

	for i := 0; i < len(labelNodes); i++ {
		labels = append(labels, labelNodes[i].Name)
	}

	return labels
}

func apiClient(token string) *githubv4.Client {
	tokenSource := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: token})
	httpClient := oauth2.NewClient(context.Background(), tokenSource)

	return githubv4.NewClient(httpClient)
}
