package github

import (
	"bytes"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"testing"

	"github.com/agilepathway/label-checker/internal/error/panic"
)

//nolint:gochecknoglobals
var integration = flag.Bool(
	"integration",
	false,
	"Make calls to real external services.  Requires INPUT_REPO_TOKEN environment variable.")

//nolint:gochecknoglobals
var enterpriseCloud = flag.Bool(
	"enterprise-cloud",
	false,
	"Run the label checker against GitHub Enterprise Cloud instead of standard GitHub")

//nolint:gochecknoglobals
var enterpriseServer = flag.Bool(
	"enterprise-server",
	false,
	"Run the label checker against GitHub Enterprise Server instead of standard GitHub")

//nolint:lll
const (
	EnvGitHubRepository            = "GITHUB_REPOSITORY"
	EnvGitHubEventPath             = "GITHUB_EVENT_PATH"
	EnvRequireOneOf                = "INPUT_ONE_OF"
	EnvRequireNoneOf               = "INPUT_NONE_OF"
	EnvRequireAllOf                = "INPUT_ALL_OF"
	EnvRequireAnyOf                = "INPUT_ANY_OF"
	EnvHTTPSProxy                  = "HTTPS_PROXY"
	EnvGitHubEnterprise            = "INPUT_GITHUB_ENTERPRISE_GRAPHQL_URL"
	EnvAllowFailure                = "INPUT_ALLOW_FAILURE"
	EnvPrefixMode                  = "INPUT_PREFIX_MODE"
	EnvGitHubOutput                = "GITHUB_OUTPUT"
	GitHubEnterpriseCloudEndpoint  = "https://api.github.com/graphql"
	GitHubEnterpriseServerEndpoint = "https://example.com/api/graphql"
	GitHubTestRepo                 = "agilepathway/test-label-checker-consumer"
	NoLabelsPR                     = 1 // https://github.com/agilepathway/test-label-checker-consumer/pull/1
	OneLabelPR                     = 2 // https://github.com/agilepathway/test-label-checker-consumer/pull/2
	TwoLabelsPR                    = 3 // https://github.com/agilepathway/test-label-checker-consumer/pull/3
	ThreeLabelsPR                  = 4 // https://github.com/agilepathway/test-label-checker-consumer/pull/4
	PrefixOneLabelPR               = 5 // https://github.com/agilepathway/test-label-checker-consumer/pull/5
	PrefixTwoLabelsPR              = 6 // https://github.com/agilepathway/test-label-checker-consumer/pull/6
	PrefixThreeLabelsPR            = 7 // https://github.com/agilepathway/test-label-checker-consumer/pull/7
	GitHubEventJSONDir             = "../../testdata/temp"
	GitHubEventJSONFilename        = "github_event.json"
	GitHubOutputFilename           = "github_output"
	HoverflyProxyAddress           = "127.0.0.1:8500"
	NeedNoneGotNone                = "Label check successful: required none of 'major', 'minor', 'patch', and found 0.\n"
	NeedNoneGotOne                 = "Label check failed: required none of 'major', 'minor', 'patch', but found 1: 'minor'\n"
	NeedNoneGotTwo                 = "Label check failed: required none of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n"
	NeedNoneGotThree               = "Label check failed: required none of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n"
	NeedOneGotOne                  = "Label check successful: required 1 of 'major', 'minor', 'patch', and found 1: 'minor'\n"
	NeedOneGotNone                 = "Label check failed: required 1 of 'major', 'minor', 'patch', but found 0.\n"
	NeedOneGotTwo                  = "Label check failed: required 1 of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n"
	NeedOneGotThree                = "Label check failed: required 1 of 'major', 'minor', 'patch', but found 3: 'major', 'minor', 'patch'\n"
	NeedAllGotNone                 = "Label check failed: required all of 'major', 'minor', 'patch', but found 0.\n"
	NeedAllGotOne                  = "Label check failed: required all of 'major', 'minor', 'patch', but found 1: 'minor'\n"
	NeedAllGotTwo                  = "Label check failed: required all of 'major', 'minor', 'patch', but found 2: 'minor', 'patch'\n"
	NeedAllGotAll                  = "Label check successful: required all of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n"
	NeedAnyGotNone                 = "Label check failed: required any of 'major', 'minor', 'patch', but found 0.\n"
	NeedAnyGotOne                  = "Label check successful: required any of 'major', 'minor', 'patch', and found 1: 'minor'\n"
	NeedAnyGotTwo                  = "Label check successful: required any of 'major', 'minor', 'patch', and found 2: 'minor', 'patch'\n"
	NeedAnyGotThree                = "Label check successful: required any of 'major', 'minor', 'patch', and found 3: 'major', 'minor', 'patch'\n"
	PrefixNeedNoneGotNone          = "Label check successful: required none prefixed with 'type:', and found 0.\n"
	PrefixNeedNoneGotOne           = "Label check failed: required none prefixed with 'type:', but found 1: 'type:fix'\n"
	PrefixNeedNoneGotTwo           = "Label check failed: required none prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n"
	PrefixNeedOneGotNone           = "Label check failed: required 1 prefixed with 'type:', but found 0.\n"
	PrefixNeedOneGotOne            = "Label check successful: required 1 prefixed with 'type:', and found 1: 'type:fix'\n"
	PrefixNeedOneGotTwo            = "Label check failed: required 1 prefixed with 'type:', but found 2: 'type:fix', 'type:feature'\n"
	PrefixNeedAnyGotNone           = "Label check failed: required any prefixed with 'type:', but found 0.\n"
	PrefixNeedAnyGotOne            = "Label check successful: required any prefixed with 'type:', and found 1: 'type:fix'\n"
	PrefixNeedAnyGotTwo            = "Label check successful: required any prefixed with 'type:', and found 2: 'type:fix', 'type:feature'\n"
	PrefixNeedAnyGotThree          = "Label check successful: required any prefixed with 'type:', and found 3: 'type:fix', 'type:feature', 'type:documentation'\n"
	PrefixNeedAllError             = "The label checker does not support prefix checking with `all_of`, as that is not a logical combination.\n"
	PrefixMultiplePrefixesError    = "Currently the label checker only supports checking with one prefix, not multiple.\n"
)

type specifyChecks func()

//nolint:lll,funlen,dupl
func TestLabelChecks(t *testing.T) {
	tests := map[string]struct {
		prNumber       int
		specifyChecks  specifyChecks
		expectedStdout string
		expectedStderr string
		prefixMode     bool
	}{
		"Need none,                  got none":  {NoLabelsPR, checkNone, NeedNoneGotNone, "", false},
		"Need none,                  got one":   {OneLabelPR, checkNone, "", NeedNoneGotOne, false},
		"Need none,                  got two":   {TwoLabelsPR, checkNone, "", NeedNoneGotTwo, false},
		"Need one,                   got none":  {NoLabelsPR, checkOne, "", NeedOneGotNone, false},
		"Need one,                   got one":   {OneLabelPR, checkOne, NeedOneGotOne, "", false},
		"Need one,                   got two":   {TwoLabelsPR, checkOne, "", NeedOneGotTwo, false},
		"Need all,                   got none":  {NoLabelsPR, checkAll, "", NeedAllGotNone, false},
		"Need all,                   got one":   {OneLabelPR, checkAll, "", NeedAllGotOne, false},
		"Need all,                   got two":   {TwoLabelsPR, checkAll, "", NeedAllGotTwo, false},
		"Need all,                   got all":   {ThreeLabelsPR, checkAll, NeedAllGotAll, "", false},
		"Need any,                   got none":  {NoLabelsPR, checkAny, "", NeedAnyGotNone, false},
		"Need any,                   got one":   {OneLabelPR, checkAny, NeedAnyGotOne, "", false},
		"Need any,                   got two":   {TwoLabelsPR, checkAny, NeedAnyGotTwo, "", false},
		"Need any,                   got three": {ThreeLabelsPR, checkAny, NeedAnyGotThree, "", false},
		"Need [none, one],           got none":  {NoLabelsPR, checkNoneAndOne, NeedNoneGotNone, NeedOneGotNone, false},
		"Need [none, one],           got one":   {OneLabelPR, checkNoneAndOne, NeedOneGotOne, NeedNoneGotOne, false},
		"Need [none, one],           got two":   {TwoLabelsPR, checkNoneAndOne, "", NeedOneGotTwo + NeedNoneGotTwo, false},
		"Need [none, one, all],      got none":  {NoLabelsPR, checkNoneAndOneAndAll, NeedNoneGotNone, NeedOneGotNone + NeedAllGotNone, false},
		"Need [none, one, all],      got one":   {OneLabelPR, checkNoneAndOneAndAll, NeedOneGotOne, NeedNoneGotOne + NeedAllGotOne, false},
		"Need [none, one, all],      got two":   {TwoLabelsPR, checkNoneAndOneAndAll, "", NeedOneGotTwo + NeedNoneGotTwo + NeedAllGotTwo, false},
		"Need [none, one, all],      got three": {ThreeLabelsPR, checkNoneAndOneAndAll, NeedAllGotAll, NeedOneGotThree + NeedNoneGotThree, false},
		"Need [none, one, all, any], got none":  {NoLabelsPR, checkNoneAndOneAndAllAndAny, NeedNoneGotNone, NeedOneGotNone + NeedAllGotNone + NeedAnyGotNone, false},
		"Need [none, one, all, any], got one":   {OneLabelPR, checkNoneAndOneAndAllAndAny, NeedOneGotOne + NeedAnyGotOne, NeedNoneGotOne + NeedAllGotOne, false},
		"Need [none, one, all, any], got two":   {TwoLabelsPR, checkNoneAndOneAndAllAndAny, NeedAnyGotTwo, NeedOneGotTwo + NeedNoneGotTwo + NeedAllGotTwo, false},
		"Need [none, one, all, any], got three": {ThreeLabelsPR, checkNoneAndOneAndAllAndAny, NeedAllGotAll + NeedAnyGotThree, NeedOneGotThree + NeedNoneGotThree, false},

		// prefix mode tests
		"(prefix) Need none,          got none":  {NoLabelsPR, prefixCheckNone, PrefixNeedNoneGotNone, "", true},
		"(prefix) Need none,          got one":   {PrefixOneLabelPR, prefixCheckNone, "", PrefixNeedNoneGotOne, true},
		"(prefix) Need none,          got two":   {PrefixTwoLabelsPR, prefixCheckNone, "", PrefixNeedNoneGotTwo, true},
		"(prefix) Need one,           got none":  {NoLabelsPR, prefixCheckOne, "", PrefixNeedOneGotNone, true},
		"(prefix) Need one,           got one":   {PrefixOneLabelPR, prefixCheckOne, PrefixNeedOneGotOne, "", true},
		"(prefix) Need one,           got two":   {PrefixTwoLabelsPR, prefixCheckOne, "", PrefixNeedOneGotTwo, true},
		"(prefix) Need any,           got none":  {NoLabelsPR, prefixCheckAny, "", PrefixNeedAnyGotNone, true},
		"(prefix) Need any,           got one":   {PrefixOneLabelPR, prefixCheckAny, PrefixNeedAnyGotOne, "", true},
		"(prefix) Need any,           got two":   {PrefixTwoLabelsPR, prefixCheckAny, PrefixNeedAnyGotTwo, "", true},
		"(prefix) Need any,           got three": {PrefixThreeLabelsPR, prefixCheckAny, PrefixNeedAnyGotThree, "", true},
		"(prefix) Need [none, one],   got none":  {NoLabelsPR, prefixCheckNoneAndOne, PrefixNeedNoneGotNone, PrefixNeedOneGotNone, true},
		"(prefix) Need all,           got none":  {NoLabelsPR, prefixCheckAll, "", PrefixNeedAllError, true},
		"(prefix) Need all,           got one":   {PrefixOneLabelPR, prefixCheckAll, "", PrefixNeedAllError, true},
		"(prefix) Need all,           got two":   {PrefixTwoLabelsPR, prefixCheckAll, "", PrefixNeedAllError, true},
		"(prefix) Need all,           got all":   {PrefixThreeLabelsPR, prefixCheckAll, "", PrefixNeedAllError, true},
		"(prefix) Need none, multiple prefixes":  {NoLabelsPR, prefixCheckNoneWithMultiplePrefixes, "", PrefixMultiplePrefixesError, true},
		"(prefix) Need one, multiple prefixes":   {NoLabelsPR, prefixCheckOneWithMultiplePrefixes, "", PrefixMultiplePrefixesError, true},
		"(prefix) Need any, multiple prefixes":   {NoLabelsPR, prefixCheckAnyWithMultiplePrefixes, "", PrefixMultiplePrefixesError, true},
		"(prefix) Need all, multiple prefixes":   {NoLabelsPR, prefixCheckAllWithMultiplePrefixes, "", PrefixMultiplePrefixesError, true},
	}
	for name, tc := range tests {
		tc := tc

		t.Run(name, func(t *testing.T) {
			tc.expectedStdout = "Checking GitHub labels ...\n" + tc.expectedStdout
			if len(tc.expectedStderr) > 0 {
				tc.expectedStderr = "::error:: " + tc.expectedStderr
			}

			setPullRequestNumber(tc.prNumber)
			setPrefixMode(tc.prefixMode)
			tc.specifyChecks()

			exitCode, stdout, stderr := checkLabels()

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

			os.Unsetenv(EnvPrefixMode)    //nolint
			os.Unsetenv(EnvRequireNoneOf) //nolint
			os.Unsetenv(EnvRequireOneOf)  //nolint
			os.Unsetenv(EnvRequireAllOf)  //nolint
			os.Unsetenv(EnvRequireAnyOf)  //nolint
		})
	}
}

func TestMain(m *testing.M) {
	flag.Parse()
	os.Mkdir(GitHubEventJSONDir, os.ModePerm)            //nolint
	os.Create(gitHubOutputFullPath())                    //nolint
	os.Setenv(EnvGitHubRepository, GitHubTestRepo)       //nolint
	os.Setenv(EnvGitHubEventPath, gitHubEventFullPath()) //nolint
	os.Setenv(EnvGitHubOutput, gitHubOutputFullPath())   //nolint
	os.Setenv(EnvRequireOneOf, " ")                      //nolint
	os.Setenv(EnvRequireNoneOf, " ")                     //nolint
	os.Setenv(EnvRequireAllOf, " ")                      //nolint
	os.Setenv(EnvRequireAnyOf, " ")                      //nolint
	os.Setenv(EnvRequireAnyOf, " ")                      //nolint
	setupVirtualServicesIfNotInIntegrationMode()
	setEnterpriseEndpointIfInEnterpriseMode()
	os.Exit(testMainWrapper(m))
}

func testMainWrapper(m *testing.M) int {
	//nolint
	defer func() {
		os.RemoveAll(GitHubEventJSONDir)
		os.Unsetenv(EnvGitHubRepository)
		os.Unsetenv(EnvGitHubEventPath)
		os.Unsetenv(EnvGitHubEnterprise)
		os.Unsetenv(EnvAllowFailure)
		teardownVirtualServicesIfNotInIntegrationMode()
	}()

	return m.Run()
}

func setupVirtualServicesIfNotInIntegrationMode() {
	if !*integration {
		startHoverflyInSpyMode()
		os.Setenv(EnvHTTPSProxy, HoverflyProxyAddress) //nolint
		importGitHubSimulations()
	}
}

func teardownVirtualServicesIfNotInIntegrationMode() {
	if !*integration {
		os.Unsetenv(EnvHTTPSProxy) //nolint
		stopHoverfly()
	}
}

func setEnterpriseEndpointIfInEnterpriseMode() {
	if *enterpriseCloud {
		os.Setenv(EnvGitHubEnterprise, GitHubEnterpriseCloudEndpoint) //nolint
	} else if *enterpriseServer {
		os.Setenv(EnvGitHubEnterprise, GitHubEnterpriseServerEndpoint) //nolint
	}
}

func execHoverCtl(arg ...string) {
	// #nosec 204 https://github.com/securego/gosec/issues/343
	cmd := exec.Command("hoverctl", arg...)
	stdout, err := cmd.Output()
	panic.IfError(err)
	log.Println(string(stdout))
}

func startHoverflyInSpyMode() {
	execHoverCtl("start")
	execHoverCtl("mode", "spy")
}

func importGitHubSimulations() {
	if *enterpriseServer {
		execHoverCtl("import", "../../testdata/github_enterprise_server_api.json")
	} else {
		execHoverCtl("import", "../../testdata/github_api.json")
	}
}

func stopHoverfly() {
	execHoverCtl("stop")
}

func checkLabels() (int, *bytes.Buffer, *bytes.Buffer) {
	stdout := &bytes.Buffer{}
	stderr := &bytes.Buffer{}
	a := Action{}

	return a.CheckLabels(stdout, stderr), stdout, stderr
}

func setPullRequestNumber(prNumber int) {
	githubEventJSON := []byte(fmt.Sprintf(`{ "pull_request": { "number": %d } }`, prNumber))
	os.WriteFile(gitHubEventFullPath(), githubEventJSON, os.ModePerm) //nolint
}

func setPrefixMode(prefixMode bool) {
	os.Setenv(EnvPrefixMode, strconv.FormatBool(prefixMode)) //nolint
}

func checkOne() {
	os.Setenv(EnvRequireOneOf, "major,minor,patch") //nolint
}

func prefixCheckOne() {
	os.Setenv(EnvRequireOneOf, "type:") //nolint
}

func checkNone() {
	os.Setenv(EnvRequireNoneOf, `major,minor,patch`) //nolint
}

func prefixCheckNone() {
	os.Setenv(EnvRequireNoneOf, `type:`) //nolint
}

func checkAll() {
	os.Setenv(EnvRequireAllOf, `major,minor,patch`) //nolint
}

func prefixCheckAll() {
	os.Setenv(EnvRequireAllOf, `type:`) //nolint
}

func checkAny() {
	os.Setenv(EnvRequireAnyOf, `major,minor,patch`) //nolint
}

func prefixCheckAny() {
	os.Setenv(EnvRequireAnyOf, `type:`) //nolint
}

func checkNoneAndOne() {
	checkNone()
	checkOne()
}

func prefixCheckNoneAndOne() {
	prefixCheckNone()
	prefixCheckOne()
}

func prefixCheckNoneWithMultiplePrefixes() {
	os.Setenv(EnvRequireNoneOf, `type:,visibility/`) //nolint
}

func prefixCheckOneWithMultiplePrefixes() {
	os.Setenv(EnvRequireOneOf, `type:,visibility/`) //nolint
}

func prefixCheckAnyWithMultiplePrefixes() {
	os.Setenv(EnvRequireAnyOf, `type:,visibility/`) //nolint
}

func prefixCheckAllWithMultiplePrefixes() {
	os.Setenv(EnvRequireAllOf, `type:,visibility/`) //nolint
}

func checkNoneAndOneAndAll() {
	checkNoneAndOne()
	checkAll()
}

func checkNoneAndOneAndAllAndAny() {
	checkNoneAndOneAndAll()
	checkAny()
}

func gitHubEventFullPath() string {
	return filepath.Join(GitHubEventJSONDir, GitHubEventJSONFilename)
}

func gitHubOutputFullPath() string {
	return filepath.Join(GitHubEventJSONDir, GitHubOutputFilename)
}
