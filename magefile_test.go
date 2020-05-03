package test

import (
	"bytes"
	"fmt"
	"os"
	"testing"

	"github.com/magefile/mage/mage"
)

const (
	EnvGitHubRepository        = "GITHUB_REPOSITORY"
	EnvGitHubRef               = "GITHUB_REF"
	EnvGitHubActionInputLabels = "GITHUB_ACTION_INPUT_LABELS"
	GitHubTestRepo             = "agilepathway/test-label-checker-consumer"
	PRWithNoLabels             = 1 // https://github.com/agilepathway/test-label-checker-consumer/pull/1
	PRWithOneSpecifiedLabel    = 2 // https://github.com/agilepathway/test-label-checker-consumer/pull/2
	PRWithTwoSpecifiedLabels   = 3 // https://github.com/agilepathway/test-label-checker-consumer/pull/3
)

func TestPullRequestWithOneSpecifiedLabelShouldSucceed(t *testing.T) {
	setPullRequestNumber(PRWithOneSpecifiedLabel)
	specifySemVerLabels()

	exitCode, stderr, stdout := checkLabels()

	expectedSuccessMessage := "Label check successful: required one of major, minor, patch, and found: minor\n"
	expectSuccess(exitCode, t, stderr, stdout, expectedSuccessMessage)
}

func TestPullRequestWithNoSpecifiedLabelsShouldFail(t *testing.T) {
	setPullRequestNumber(PRWithNoLabels)
	specifySemVerLabels()

	exitCode, stderr, _ := checkLabels()

	expectError(exitCode, t, stderr, "Error: Label check failed: required one of major, minor, patch\n")
}

func TestPullRequestWithTwoSpecifiedLabelsShouldFail(t *testing.T) {
	setPullRequestNumber(PRWithTwoSpecifiedLabels)
	specifySemVerLabels()

	exitCode, stderr, _ := checkLabels()

	expectError(exitCode, t, stderr, "Error: Label check failed: required one of major, minor, patch\n")
}

func TestMain(m *testing.M) {
	os.Setenv(EnvGitHubRepository, GitHubTestRepo) //nolint
	os.Exit(testMainWrapper(m))
}

func testMainWrapper(m *testing.M) int {
	//nolint
	defer func() {
		os.Unsetenv(EnvGitHubRepository)
		os.Unsetenv(EnvGitHubRef)
		os.Unsetenv(EnvGitHubActionInputLabels)
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
	os.Setenv(EnvGitHubRef, fmt.Sprintf("refs/pull/%d/merge", prNumber)) //nolint
}

func specifySemVerLabels() {
	os.Setenv(EnvGitHubActionInputLabels, `["major","minor","patch"]`) //nolint
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
