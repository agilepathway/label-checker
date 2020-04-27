FROM golang:1.14

# Copy all the files from the host into the container
WORKDIR /src
COPY . .

RUN scripts/install-mage.sh

RUN mage -compile /bin/check-labels -goos linux -goarch amd64

ENTRYPOINT ["/bin/check-labels"]
