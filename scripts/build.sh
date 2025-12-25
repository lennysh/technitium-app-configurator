#!/bin/bash

# Build script for Technitium DNS Server App Configurator
# Builds a container image using Docker or Podman

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
IMAGE_NAME="technitium-app-configurator"
IMAGE_TAG="latest"

echo "Building Technitium DNS Server App Configurator..."

# Detect container runtime
CONTAINER_CMD=""
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
    echo "Using Podman"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
    echo "Using Docker"
else
    echo "Error: Neither Docker nor Podman is installed or in PATH"
    echo "Please install one of:"
    echo "  - Docker from https://docs.docker.com/get-docker/"
    echo "  - Podman from https://podman.io/getting-started/installation"
    exit 1
fi

# Build the container image
cd "${PROJECT_ROOT}"

${CONTAINER_CMD} build \
    -f "${PROJECT_ROOT}/Containerfile" \
    -t "${IMAGE_NAME}:${IMAGE_TAG}" \
    "${PROJECT_ROOT}"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Build successful!"
    echo ""
    echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
    echo ""
    echo "To run the container:"
    echo "  ${CONTAINER_CMD} run -d -p 3000:80 --name technitium-config ${IMAGE_NAME}:${IMAGE_TAG}"
    echo ""
    echo "Or use a custom port:"
    echo "  PORT=8080 ./scripts/start.sh"
    echo ""
    echo "Then access the webapp at: http://localhost:3000 (or your custom port)"
else
    echo ""
    echo "✗ Build failed!"
    exit 1
fi

