FROM golang:1.16.6-buster AS builder

WORKDIR /src
COPY . .

RUN scripts/install-mage.sh \
    && CGO_ENABLED=0 GOFLAGS=-ldflags="-w" mage -compile /bin/check-labels -goos linux -goarch amd64 \
    # Strip any symbols - this is not a library
    && strip /bin/check-labels \
    # Compress the compiled action using UPX (https://upx.github.io/) 
    && apt-get update && apt-get -y install --no-install-recommends upx-ucl=3.95-1 \
    && upx -q -9 /bin/check-labels

# Use the most basic and empty container - no runtime, files, shell, libraries, etc.
FROM scratch

# We need the ssl certs for when we make an https call to the GitHub API
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

COPY --from=builder /bin/check-labels /bin/check-labels

ENTRYPOINT ["/bin/check-labels", "-v"]
