// +build mage

//nolint:unused,deadcode,gochecknoglobals
package main

import "github.com/agilepathway/label-checker/internal/github"

var Default = PullRequestLabelChecker

// PullRequestLabelChecker checks pull requests for the presence or absence of specified GitHub labels
func PullRequestLabelChecker() error {
	a := github.Action{}
	return a.CheckLabels()
}
