# Security Policy

## Supported Versions

**Any fixes for security vulnerabilities will be applied to a new release only**, rather than
retrospectively applied to previous releases.  

The reason for this is that the label checker is a standalone GitHub Action with (purposefully)
minimal dependencies and therefore very straightforward for consumers to update versions. It's
**recommended for consumers to pin to the major version of the label checker**, so that they
automatically get all new backwards compatible updates (major version updates will be extremely
rare events, one every few years at most, and very possible less frequent even than that).

If a vulnerability is serious enough we may also apply it to previous major versions, but this
is not guaranteed.

## Reporting a Vulnerability

Our policy is for vulnerability reports to be [reported privately](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).
To report a new vulnerability:

1. go to the [repository's Security Advisories page](https://github.com/agilepathway/label-checker/security/advisories)
2. click on `Report a vulnerability`

[Tips on creating a great vulnerability report](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/best-practices-for-writing-repository-security-advisories#best-practices)

We welcome and appreciate vulnerability reports and will endeavour to respond very swiftly.
