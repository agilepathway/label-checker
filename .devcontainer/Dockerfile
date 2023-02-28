#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
#-------------------------------------------------------------------------------------------------------------

# When we update the base image version (which we do manually, prompted by Dependabot
# notifying us of a new Go version), make sure our new base images is listed at:
# https://hub.docker.com/_/golang
FROM golang:1.20.1-bullseye

# This Dockerfile adds a non-root user with sudo access. Use the "remoteUser"
# property in devcontainer.json to use it. On Linux, the container user's GID/UIDs
# will be updated to match your local UID/GID (when using the dockerFile property).
# See https://aka.ms/vscode-remote/containers/non-root-user for details.
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Configure apt, install packages and tools
# hadolint ignore=DL3003,DL3008,DL4006
RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends apt-utils dialog 2>&1 \
    # Need zip and unzip for the Hoverfly installation
    && apt-get -y install --no-install-recommends zip unzip \
    #
    # Verify git, process tools, lsb-release (common in install instructions for CLIs) installed
    && apt-get -y install --no-install-recommends \
        git \
        openssh-client \
        less \
        iproute2 \
        procps \
        lsb-release \
    # Build Go tools
    && mkdir -p /tmp/gotools \
    && cd /tmp/gotools \
    && GOPATH=/tmp/gotools go install golang.org/x/tools/gopls@v0 2>&1 \
    && GOPATH=/tmp/gotools go install github.com/go-delve/delve/cmd/dlv@v1 2>&1 \
    && GOPATH=/tmp/gotools go install github.com/golangci/golangci-lint/cmd/golangci-lint@v1 2>&1 \
    #
    # Install Go tools
    && mv /tmp/gotools/bin/* /usr/local/bin/ \
    #
    # Create a non-root user to use if preferred - see https://aka.ms/vscode-remote/containers/non-root-user.
    && groupadd --gid $USER_GID $USERNAME \
    && useradd -s /bin/bash --uid $USER_UID --gid $USER_GID -m $USERNAME \
    # [Optional] Add sudo support
    && apt-get install -y --no-install-recommends sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    #
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/* /tmp/gotools

# Install Hoverfly for virtualised tests: https://hoverfly.readthedocs.io/
# hadolint ignore=DL3003
RUN mkdir -p /tmp/hoverfly \
    && cd /tmp/hoverfly || exit \
    && export HOVERFLY_PLATFORM=linux_amd64 \
    && export HOVERFLY_PLATFORM=linux_amd64 \
    && export HOVERFLY_VERSION=v1.5.0 \
    && export "HOVERFLY_BUNDLE=hoverfly_bundle_$HOVERFLY_PLATFORM" \
    && wget -q --show-progress "https://github.com/SpectoLabs/hoverfly/releases/download/$HOVERFLY_VERSION/$HOVERFLY_BUNDLE.zip" \
    && unzip "$HOVERFLY_BUNDLE.zip" \
    && mv hoverfly /usr/local/bin/ \
    && mv hoverctl /usr/local/bin/ \
    && chmod +x /usr/local/bin/hoverfly \
    && chmod +x /usr/local/bin/hoverctl \
    # Add the trusted Hoverfly certificate so that Hoverfly SSL calls work
    && wget -q --show-progress https://raw.githubusercontent.com/SpectoLabs/hoverfly/master/core/cert.pem \
    && cp cert.pem /usr/local/share/ca-certificates/hoverfly.crt \
    && update-ca-certificates \
    && rm -rf /tmp/hoverfly

# Install Hadolint for Dockerfile linting
# hadolint ignore=DL3003
RUN mkdir -p /tmp/hadolint \
    && cd /tmp/hadolint || exit \
    && wget -q https://github.com/hadolint/hadolint/releases/latest/download/hadolint-Linux-x86_64 \
    && mv hadolint-Linux-x86_64 /usr/local/bin/hadolint \
    && chmod +x /usr/local/bin/hadolint \
    && rm -rf /tmp/hadolint
