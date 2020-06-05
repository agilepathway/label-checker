package test

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"

	"github.com/magefile/mage/mage"
)

const (
	EnvGitHubRepository     = "GITHUB_REPOSITORY"
	EnvGitHubEventPath      = "GITHUB_EVENT_PATH"
	EnvRequireOneOf         = "LABELS_ONE_REQUIRED"
	EnvRequireNoneOf        = "LABELS_NONE_REQUIRED"
	GitHubTestRepo          = "agilepathway/test-label-checker-consumer"
	NoLabelsPR              = 1 // https://github.com/agilepathway/test-label-checker-consumer/pull/1
	OneLabelPR              = 2 // https://github.com/agilepathway/test-label-checker-consumer/pull/2
	TwoLabelsPR             = 3 // https://github.com/agilepathway/test-label-checker-consumer/pull/3
	GitHubEventJSONDir      = "testdata"
	GitHubEventJSONFilename = "github_event.json"
	MagefileVerbose         = "MAGEFILE_VERBOSE"
	NeedNoneGotNone         = "Label check successful: required 0 of major, minor, patch, and found 0.\n"
	NeedNoneGotOne          = "Label check failed: required 0 of major, minor, patch, but found 1: minor\n"
	NeedNoneGotTwo          = "Label check failed: required 0 of major, minor, patch, but found 2: minor, patch\n"
	NeedOneGotOne           = "Label check successful: required 1 of major, minor, patch, and found 1: minor\n"
	NeedOneGotNone          = "Label check failed: required 1 of major, minor, patch, but found 0.\n"
	NeedOneGotTwo           = "Label check failed: required 1 of major, minor, patch, but found 2: minor, patch\n"
)

type specifyChecks func()

func TestSplit(t *testing.T) {
	tests := map[string]struct {
		prNumber       int
		specifyChecks  specifyChecks
		expectedStdout string
		expectedStderr string
	}{
		"Need none, got none":                     {NoLabelsPR, checkNone, NeedNoneGotNone, ""},
		"Need none, got one":                      {OneLabelPR, checkNone, "", NeedNoneGotOne},
		"Need none, got two":                      {TwoLabelsPR, checkNone, "", NeedNoneGotTwo},
		"Need one, got none":                      {NoLabelsPR, checkOne, "", NeedOneGotNone},
		"Need one, got one":                       {OneLabelPR, checkOne, NeedOneGotOne, ""},
		"Need one, got two":                       {TwoLabelsPR, checkOne, "", NeedOneGotTwo},
		"Need none, got none; need one, got none": {NoLabelsPR, checkNoneAndOne, NeedNoneGotNone, NeedOneGotNone},
		"Need none, got one; need one, got one":   {OneLabelPR, checkNoneAndOne, NeedOneGotOne, NeedNoneGotOne},
		"Need none, got two; need one, got two":   {TwoLabelsPR, checkNoneAndOne, "", NeedOneGotTwo + NeedNoneGotTwo},
	}
	for name, tc := range tests {
		tc := tc

		t.Run(name, func(t *testing.T) {
			tc.expectedStdout = "Checking GitHub labels ...\n" + tc.expectedStdout
			if len(tc.expectedStderr) > 0 {
				tc.expectedStderr = "Error: " + tc.expectedStderr
			}
			setPullRequestNumber(tc.prNumber)
			tc.specifyChecks()

			exitCode, stderr, stdout := checkLabels()

			if (len(tc.expectedStderr) > 0) && (exitCode == 0) {
				t.Fatalf("got exit code %v, err: %s", exitCode, stderr)
			}

			if (len(tc.expectedStderr) == 0) && (exitCode != 0) {
				t.Fatalf("got exit code %v, err: %s", exitCode, stderr)
			}

			if actual := stdout.String(); actual != tc.expectedStdout {
				t.Fatalf("expected %q but got %q", tc.expectedStdout, actual)
			}

			if actual := stderr.String(); actual != tc.expectedStderr {
				t.Fatalf("expected %q but got %q", tc.expectedStderr, actual)
			}

			os.Unsetenv(EnvRequireNoneOf) //nolint
			os.Unsetenv(EnvRequireOneOf)  //nolint
		})
	}
}

func TestMain(m *testing.M) {
	os.Mkdir(GitHubEventJSONDir, os.ModePerm)            //nolint
	os.Setenv(EnvGitHubRepository, GitHubTestRepo)       //nolint
	os.Setenv(EnvGitHubEventPath, gitHubEventFullPath()) //nolint
	os.Setenv(MagefileVerbose, "1")                      //nolint
	os.Exit(testMainWrapper(m))
}

func testMainWrapper(m *testing.M) int {
	//nolint
	defer func() {
		os.RemoveAll(GitHubEventJSONDir)
		os.Unsetenv(EnvGitHubRepository)
		os.Unsetenv(EnvGitHubEventPath)
		os.Unsetenv(MagefileVerbose)
	}()

	return m.Run()
}

func checkLabels() (int, *bytes.Buffer, *bytes.Buffer) {
	stdout := &bytes.Buffer{}
	stderr := &bytes.Buffer{}
	invocation := mage.Invocation{Stderr: stderr, Stdout: stdout}

	return mage.Invoke(invocation), stderr, stdout
}

func setPullRequestNumber(prNumber int) {
	githubEventJSON := []byte(fmt.Sprintf(`{ "number": %d }`, prNumber))
	ioutil.WriteFile(gitHubEventFullPath(), githubEventJSON, os.ModePerm) //nolint
}

func checkOne() {
	os.Setenv(EnvRequireOneOf, `["major","minor","patch"]`) //nolint
}

func checkNone() {
	os.Setenv(EnvRequireNoneOf, `["major","minor","patch"]`) //nolint
}

func checkNoneAndOne() {
	checkNone()
	checkOne()
}

func gitHubEventFullPath() string {
	return filepath.Join(GitHubEventJSONDir, GitHubEventJSONFilename)
}
