// +build mage

//nolint:unused,deadcode,gochecknoglobals
package main

import (
	"errors"
	"fmt"

	"github.com/agilepathway/label-checker/internal/github/pullrequest"
)

var Default = GitHubLabelChecker

// GitHubLabelChecker checks for the presence of GitHub labels
func GitHubLabelChecker() error {
	fmt.Println("Checking GitHub labels ...")
	valid, message := pullrequest.ValidLabels()
	if !valid {
		return errors.New(message)
	}
	fmt.Println(message)
	return nil
}
