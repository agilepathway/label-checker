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
	return l.hasXof(specified, 1)
}

// HasNoneOf indicates whether the labels contain
// none of the specified labels, along with a report describing the result.
func (l Labels) HasNoneOf(specified []string) (bool, string) {
	return l.hasXof(specified, 0)
}

func (l Labels) hasXof(specified []string, x int) (bool, string) {
	var (
		validationMessageBuilder strings.Builder
		foundLabels              []string
	)

	t := template.Must(template.New("validationMessage").Parse("" +
		"{{ $numberFound := len .Found }}" +
		"{{ $valid := eq $numberFound .X }}" +

		"Label check " +
		"{{if $valid}}successful{{else }}failed{{end}}: " +
		"required {{.X}} of {{range $s := .Specified}}{{$s}}, {{end}}" +
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
		X         int
	}{specified, l, foundLabels, x}))

	validationMessage := validationMessageBuilder.String()

	if len(foundLabels) == x {
		return true, validationMessage
	}

	return false, validationMessage
}
