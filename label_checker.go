//nolint:unused,deadcode,gochecknoglobals
package main

import (
	"os"

	"github.com/agilepathway/label-checker/internal/github"
)

func main() {
	a := github.Action{}
	exitCode := a.CheckLabels(os.Stdout, os.Stderr)
	os.Exit(exitCode)
}
