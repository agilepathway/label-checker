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
	PRWithNoLabels          = 1 // https://github.com/agilepathway/test-label-checker-consumer/pull/1
	PRWithOneLabel          = 2 // https://github.com/agilepathway/test-label-checker-consumer/pull/2
	PRWithTwoLabels         = 3 // https://github.com/agilepathway/test-label-checker-consumer/pull/3
	GitHubEventJSONDir      = "testdata"
	GitHubEventJSONFilename = "github_event.json"
	MagefileVerbose         = "MAGEFILE_VERBOSE"
)

func TestOneOfOneLabelShouldSucceed(t *testing.T) {
	setPullRequestNumber(PRWithOneLabel)
	specifyOneOfLabels()

	exitCode, stderr, stdout := checkLabels()

	expectedSuccessMessage := "Checking GitHub labels ...\n" +
		"Label check successful: required 1 of major, minor, patch, and found 1: minor\n"
	expectSuccess(exitCode, t, stderr, stdout, expectedSuccessMessage)

	os.Unsetenv(EnvRequireOneOf) //nolint
}

func TestNoneOfOneShouldFail(t *testing.T) {
	setPullRequestNumber(PRWithNoLabels)
	specifyOneOfLabels()

	exitCode, stderr, _ := checkLabels()

	expectError(exitCode, t, stderr, "Error: Label check failed: required 1 of major, minor, patch, but found 0.\n")

	os.Unsetenv(EnvRequireOneOf) //nolint
}

func TestTwoOfOneShouldFail(t *testing.T) {
	setPullRequestNumber(PRWithTwoLabels)
	specifyOneOfLabels()

	exitCode, stderr, _ := checkLabels()

	expectError(exitCode, t, stderr,
		"Error: Label check failed: required 1 of major, minor, patch, but found 2: minor, patch\n")

	os.Unsetenv(EnvRequireOneOf) //nolint
}

func TestNoneOfNoneShouldSucceed(t *testing.T) {
	setPullRequestNumber(PRWithNoLabels)
	specifyNoneOfLabels()

	exitCode, stderr, stdout := checkLabels()

	expectedSuccessMessage := "Checking GitHub labels ...\n" +
		"Label check successful: required 0 of major, minor, patch, and found 0.\n"
	expectSuccess(exitCode, t, stderr, stdout, expectedSuccessMessage)

	os.Unsetenv(EnvRequireNoneOf) //nolint
}

func TestOneOfNoneShouldFail(t *testing.T) {
	setPullRequestNumber(PRWithOneLabel)
	specifyNoneOfLabels()

	exitCode, stderr, _ := checkLabels()

	expectError(exitCode, t, stderr,
		"Error: Label check failed: required 0 of major, minor, patch, but found 1: minor\n")

	os.Unsetenv(EnvRequireNoneOf) //nolint
}

func TestTwoOfNoneShouldFail(t *testing.T) {
	setPullRequestNumber(PRWithTwoLabels)
	specifyNoneOfLabels()

	exitCode, stderr, _ := checkLabels()

	expectError(exitCode, t, stderr,
		"Error: Label check failed: required 0 of major, minor, patch, but found 2: minor, patch\n")

	os.Unsetenv(EnvRequireNoneOf) //nolint
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

func specifyOneOfLabels() {
	os.Setenv(EnvRequireOneOf, `["major","minor","patch"]`) //nolint
}

func specifyNoneOfLabels() {
	os.Setenv(EnvRequireNoneOf, `["major","minor","patch"]`) //nolint
}

func expectSuccess(exitCode int, t *testing.T, stderr fmt.Stringer, stdout fmt.Stringer, expectedStdOut string) {
	if exitCode != 0 {
		t.Fatalf("got exit code %v, err: %s", exitCode, stderr)
	}

	if actual := stdout.String(); actual != expectedStdOut {
		t.Fatalf("expected %q but got %q", expectedStdOut, actual)
	}
}

func expectError(exitCode int, t *testing.T, stderr fmt.Stringer, expectedStdErr string) {
	if exitCode == 0 {
		t.Fatalf("got exit code %v, err: %s", exitCode, stderr)
	}

	if actual := stderr.String(); actual != expectedStdErr {
		t.Fatalf("expected %q but got %q", expectedStdErr, actual)
	}
}

func gitHubEventFullPath() string {
	return filepath.Join(GitHubEventJSONDir, GitHubEventJSONFilename)
}
