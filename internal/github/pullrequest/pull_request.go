/*
Package pullrequest checks pull requests for specified labels
*/
package pullrequest

import (
	"context"

	"github.com/agilepathway/label-checker/internal/error/panic"
	"github.com/shurcooL/githubv4"
	"golang.org/x/oauth2"
)

// PullRequest encapsulates a GitHub Pull Request
type PullRequest struct {
	repositoryOwner string
	repository      string
	number          int
	Labels          Labels
}

// New creates a new PullRequest
func New(repoOwner string, repo string, prNumber int, ghToken string, enterpriseEndpoint string) *PullRequest {
	pr := new(PullRequest)
	pr.repositoryOwner = repoOwner
	pr.repository = repo
	pr.number = prNumber
	pr.Labels = pr.initLabels(apiClient(ghToken, enterpriseEndpoint))

	return pr
}

func (pr PullRequest) initLabels(apiClient *githubv4.Client) Labels {
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

	err := apiClient.Query(context.Background(), &query, variables)
	panic.IfError(err)

	labelNodes := query.Repository.PullRequest.Labels.Nodes

	var labels Labels

	for i := 0; i < len(labelNodes); i++ {
		labels = append(labels, labelNodes[i].Name)
	}

	return labels
}

func apiClient(token string, enterpriseEndpoint string) *githubv4.Client {
	tokenSource := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: token})
	httpClient := oauth2.NewClient(context.Background(), tokenSource)

	if enterpriseEndpoint != "" {
		return githubv4.NewEnterpriseClient(enterpriseEndpoint, httpClient)
	}

	return githubv4.NewClient(httpClient)
}
