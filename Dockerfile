FROM golang:1.14 AS builder

WORKDIR /src
COPY . .

RUN scripts/install-mage.sh

RUN CGO_ENABLED=0 mage -compile /bin/check-labels -goos linux -goarch amd64


# Use the most basic and empty container - this container has no
# runtime, files, shell, libraries, etc.
FROM scratch

# We need the ssl certs for when we make an https call to the GitHub API
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

COPY --from=builder /bin/check-labels /bin/check-labels

ENTRYPOINT ["/bin/check-labels", "-v"]
