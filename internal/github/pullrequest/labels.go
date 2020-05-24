package pullrequest

import (
	"strings"
	"text/template"

	"github.com/agilepathway/label-checker/internal/error/panic"
	"github.com/agilepathway/label-checker/internal/slice"
)

// Labels represents a collection of GitHub labels, e.g. all the labels in a pull request
type Labels []string

// HasExactlyOneOf indicates whether the labels contain exactly
// one of the specified labels, along with a report describing the result.
func (l Labels) HasExactlyOneOf(specified []string) (bool, string) {
	var (
		validationMessageBuilder strings.Builder
		foundLabels              []string
	)

	allowedNumberOfLabels := 1

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

	for i := 0; i < len(l); i++ {
		if slice.Contains(specified, l[i]) {
			foundLabels = append(foundLabels, l[i])
		}
	}

	panic.IfError(t.Execute(&validationMessageBuilder, struct {
		Specified []string
		Pr        []string
		Found     []string
	}{specified, l, foundLabels}))

	validationMessage := validationMessageBuilder.String()

	if len(foundLabels) == allowedNumberOfLabels {
		return true, validationMessage
	}

	return false, validationMessage
}
