// +build mage

//nolint:unused,deadcode,gochecknoglobals
package main

import (
	"log"

	"github.com/agilepathway/label-checker/internal/github"
)

var Default = GitHubLabelChecker

// GitHubLabelChecker checks for the presence of GitHub labels
func GitHubLabelChecker() {
	log.Println("Checking GitHub labels ...")
	github.CheckLabels()
}
