# Updating dependencies

## Dependabot

We use [GitHub Dependabot](https://docs.github.com/en/github/administering-a-repository/keeping-your-dependencies-updated-automatically) 
([bought by GitHub in 2019](https://dependabot.com/blog/hello-github/) and now 
[baked into GitHub](https://github.blog/2020-06-01-keep-all-your-packages-up-to-date-with-dependabot/)) 
to manage our dependencies.

Whenever possible we let Dependabot update our dependencies automatically (by 
[automatically creating a PR](https://docs.github.com/en/github/administering-a-repository/managing-pull-requests-for-dependency-updates#about-github-dependabot-pull-requests)
for us to merge).

Dependabot automatically updates our:
- [Go modules dependencies](https://dependabot.com/go/)
- [GitHub Actions (non-Docker dependencies only, for now)](https://github.blog/2020-06-25-dependabot-now-updates-your-actions-workflows/)

### Process for updating Go modules dependencies

Dependabot updates our dependencies and modifies `go.mod` and `go.sum` accordingly.
It [does not remove any now-obsolete entries from `go.sum`, though]().
So we have to clean up `go.sum` by doing the following:
1. check out the branch created by Dependabot, locally
2. run `go mod tidy`
3. commit and push the updated `go.sum` to the same Dependabot branch
4. review and merge the PR


### Workaround for other dependencies

For our other dependencies which cannot be updated automatically by Dependabot, we employ a bit of a hack.  
We have a [`dependabot_hack.yml`](workflows/dependabot_hack.yml) GitHub Action which triggers a Dependabot PR when these other dependencies have a new version to update to.  This GitHub Action is set to never actually run; it exists just so that Dependabot can do its thing.  The `dependabot_hack.yml` documents where in our codebase that we then need to **update to the new version manually** (we then **add this manual update as another commit to the PR that Dependabot creates**).  NB we are able to use this hack to **manage _any_ dependency that uses 
[GitHub releases](https://docs.github.com/en/github/administering-a-repository/about-releases)** - we are not limited to just dependencies which are themselves GitHub Actions (this is because Dependabot doesn't care
whether the dependencies are valid GitHub Actions, it just parses the file and updates any versions that are
managed through GitHub releases).

We could in theory automate this entirely (by e.g. having a GitHub Action that is triggered by Dependabot PRs,
which updates the version in the requisite files and then adds the change in a new commit to the Dependabot PR),
but that would be overkill for now.

Eventually as Dependabot adds more features we may be able to remove this workaround.


## Dockerfile dependencies

We have [pinned the linux dependencies in the devcontainer Dockerfile](https://github.com/agilepathway/hoverfly-github-action/pull/112/files), but there is no mechanism to automatically update them, currently.  It looks like [it's on Dependabot's roadmap](https://github.com/dependabot/dependabot-core/issues/2129#issuecomment-511552345), so we have [an issue automatically created every 6 months](https://github.com/agilepathway/hoverfly-github-action/pull/112) to 
1. update the dependencies manually
2. see if Dependabot now offer this functionality


### Updating the Dockerfile dependencies manually

1. Temporarily unpin the versions (i.e. remove `=<version>` from each package in the Dockerfile)
2. Execute the Dockerfile (e.g. if it's a remote container Dockerfile build the remote container)
3. Run `apt-cache policy <package>` for each package, to see the version installed
4. Pin all the versions, replacing any old versions with new ones



## Ubuntu version

GitHub Actions supports Ubuntu LTS versions only.  [Ubuntu releases a new LTS version every second year in
April](https://wiki.ubuntu.com/Releases).  In 2020 the GitHub Actions team [supported the new version by 
mid- June](https://github.com/actions/virtual-environments/issues/228#issuecomment-644065532), so the owner of the repo
has a reminder in their calendar every 2 years (on 15 July as that should have given GitHub sufficient time to update to
the new LTS version) to update the GitHub Actions on this repo with the new version.
