// +build mage

//nolint:unused,deadcode,gochecknoglobals
package main

import "github.com/agilepathway/label-checker/internal/github"

var Default = GitHubLabelChecker

// GitHubLabelChecker checks for the presence of GitHub labels
func GitHubLabelChecker() error {
	a := github.Action{}
	return a.CheckLabels()
}
