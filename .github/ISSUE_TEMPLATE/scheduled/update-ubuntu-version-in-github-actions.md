---
name: Update Ubuntu version in GitHub Actions
about: Stay up to date with Ubuntu
title: Update Ubuntu version in GitHub Actions
labels: ''
assignees: ''

---

[Ubuntu releases annually in April](https://wiki.ubuntu.com/Releases).  

In 2020 the GitHub Actions team [supported the April release for that year by mid June](https://github.com/actions/virtual-environments/issues/228#issuecomment-644065532), so this GitHub Issue gets automatically created annually each year on 15 July for us to do the update (as hopefully GitHub Actions will support the new version by then each year).  

We can find out if we can update yet [here](https://docs.github.com/en/actions/reference/virtual-environments-for-github-hosted-runners#supported-runners-and-hardware-resources).  

When we do the update to the new version it involves e.g. for 2021, simply replacing every case of `ubuntu-20.04` with `ubuntu-21.04`.

- [ ] when we have updated and merged the change to the main branch, [this search](https://github.com/agilepathway/label-checker/search?q=20.04&unscoped_q=20.04) should return zero results (NB it may take 5 minutes before the search index will show the right results)
- [ ] update this issue template so that it corresponds to the following year (e.g. in July 2021, replace all cases of `20.04` with `21.04`)
