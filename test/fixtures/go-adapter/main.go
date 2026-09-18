package main

import (
	"os"

	"github.com/agilepathway/label-checker/internal/github"
)

func main() {
	action := github.Action{}
	os.Exit(action.CheckLabels(os.Stdout, os.Stderr))
}
