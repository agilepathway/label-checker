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
	return l.hasXof(specified, "1")
}

// HasNoneOf indicates whether the labels contain
// none of the specified labels, along with a report describing the result.
func (l Labels) HasNoneOf(specified []string) (bool, string) {
	return l.hasXof(specified, "none")
}

// HasAllOf indicates whether the labels contain
// all of the specified labels, along with a report describing the result.
func (l Labels) HasAllOf(specified []string) (bool, string) {
	return l.hasXof(specified, "all")
}

// HasAnyOf indicates whether the labels contain
// any of the specified labels, along with a report describing the result.
func (l Labels) HasAnyOf(specified []string) (bool, string) {
	return l.hasXof(specified, "any")
}

type labelCheck struct {
	Specified []string
	Found     []string
	CheckFor  string
}

func (v labelCheck) IsValid() bool {
	var isValid bool

	switch v.CheckFor {
	case "any":
		isValid = len(v.Found) > 0
	case "none":
		isValid = len(v.Found) == 0
	case "1":
		isValid = len(v.Found) == 1
	case "all":
		isValid = len(v.Found) == len(v.Specified)
	}

	return isValid
}

func (v labelCheck) NumberFound() int {
	return len(v.Found)
}

func (l Labels) hasXof(specified []string, checkFor string) (bool, string) {
	var (
		labelCheckMsgBuilder strings.Builder
		foundLabels          []string
	)

	t := template.Must(template.New("labelCheckMessage").Parse("" +
		"Label check " +
		"{{if .IsValid}}successful{{else }}failed{{end}}: " +
		"required {{.CheckFor}} " +
		"of {{range $s := .Specified}}{{$s}}, {{end}}" +
		"{{if .IsValid}}and{{else }}but{{end}} " +
		"found {{.NumberFound}}" +
		"{{if .NumberFound}}: {{else }}.{{end}}" +
		"{{range $i, $f := .Found}}{{if $i}}, {{end}}{{$f}}{{end}}"))

	for i := 0; i < len(l); i++ {
		if slice.Contains(specified, l[i]) {
			foundLabels = append(foundLabels, l[i])
		}
	}

	check := labelCheck{specified, foundLabels, checkFor}

	panic.IfError(t.Execute(&labelCheckMsgBuilder, check))

	labelCheckMessage := labelCheckMsgBuilder.String()

	return check.IsValid(), labelCheckMessage
}
