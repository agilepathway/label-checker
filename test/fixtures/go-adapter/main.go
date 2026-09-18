package main

import (
	"net/http"
	"os"

	"github.com/agilepathway/label-checker/internal/github"
)

func main() {
	redirectGitHubAPI()
	action := github.Action{}
	os.Exit(action.CheckLabels(os.Stdout, os.Stderr))
}

func redirectGitHubAPI() {
	endpoint := os.Getenv("GITHUB_API_URL")
	if endpoint == "" {
		return
	}

	target, err := http.NewRequest(http.MethodPost, endpoint, nil)
	if err != nil {
		panic(err)
	}

	base := http.DefaultTransport
	http.DefaultTransport = roundTripperFunc(func(request *http.Request) (*http.Response, error) {
		redirected := request.Clone(request.Context())
		redirected.URL.Scheme = target.URL.Scheme
		redirected.URL.Host = target.URL.Host
		redirected.Host = target.Host

		return base.RoundTrip(redirected)
	})
}

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (f roundTripperFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}
