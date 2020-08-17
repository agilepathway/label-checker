---
name: Update dependencies in devcontainer Dockerfile
about: Stay up to date with Dockerfile dependencies
title: Update dependencies in devcontainer Dockerfile
labels: ''
assignees: ''

---


We have [pinned the linux dependencies in the devcontainer Dockerfile](https://github.com/agilepathway/hoverfly-github-action/pull/112/files), but there is no mechanism to automatically update them, currently. It looks like [it's on Dependabot's roadmap](https://github.com/dependabot/dependabot-core/issues/2129#issuecomment-511552345), so this GitHub Issue gets automatically created every 6 months to:

- [ ] update the dependencies manually:
    1. Temporarily unpin the versions (i.e. remove `=<version>` from each package in the Dockerfile)
    2. Execute the Dockerfile (e.g. if it's a remote container Dockerfile build the remote container)
    3. Run `apt-cache policy <package>` for each package, to see the version installed
    4. Pin all the versions, replacing any old versions with new ones
- [ ] see if Dependabot now offer this functionality (in which case we can do it automatically, from then on)
