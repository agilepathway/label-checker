/*
Package pullrequest checks pull requests for specified labels
*/
package pullrequest

import (
	"strings"
	"text/template"

	"github.com/agilepathway/label-checker/internal/util"
)

// ValidLabels checks for the presence of the given GitHub labels
func ValidLabels() (bool, string) {
	var githubAction action
	pullRequest := new(githubAction)

	return validLabels(githubAction.specifiedLabels(), pullRequest.labels(), 1)
}

func validLabels(specifiedLabels []string, pullRequestLabels []string, allowedNumberOfLabels int) (bool, string) {
	var (
		validationMessageBuilder strings.Builder
		foundLabels              []string
	)

	t := template.Must(template.New("validationMessage").Parse("" +
		"{{ $numberFound := len .Found }}" +
		"{{ $valid := eq $numberFound 1 }}" +

		"Label check " +
		"{{if $valid}}successful{{else }}failed{{end}}: " +
		"required 1 of {{range $s := .Specified}}{{$s}}, {{end}}" +
		"{{if $valid}}and{{else }}but{{end}} " +
		"found {{$numberFound}}" +
		"{{if $numberFound}}: {{else }}.{{end}}" +
		"{{range $i, $f := .Found}}{{if $i}}, {{end}}{{$f}}{{end}}"))

	for i := 0; i < len(pullRequestLabels); i++ {
		if util.Contains(specifiedLabels, pullRequestLabels[i]) {
			foundLabels = append(foundLabels, pullRequestLabels[i])
		}
	}

	util.PanicIfError(t.Execute(&validationMessageBuilder, struct {
		Specified []string
		Pr        []string
		Found     []string
	}{specifiedLabels, pullRequestLabels, foundLabels}))

	validationMessage := validationMessageBuilder.String()

	if len(foundLabels) == allowedNumberOfLabels {
		return true, validationMessage
	}

	return false, validationMessage
}
