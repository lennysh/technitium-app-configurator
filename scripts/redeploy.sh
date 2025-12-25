#!/bin/bash

# Redeploy script for Technitium DNS Server App Configurator
# Rebuilds and restarts the container

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_NAME="technitium-config"
IMAGE_NAME="technitium-app-configurator"
IMAGE_TAG="latest"

# Detect container runtime
CONTAINER_CMD=""
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
else
    echo "Error: Neither Docker nor Podman is installed or in PATH"
    exit 1
fi

echo "Redeploying Technitium DNS Server App Configurator..."
echo ""

# Stop and remove existing container if it exists
if ${CONTAINER_CMD} ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "Stopping existing container..."
    ${CONTAINER_CMD} stop ${CONTAINER_NAME} 2>/dev/null || true
    echo "Removing existing container..."
    ${CONTAINER_CMD} rm ${CONTAINER_NAME} 2>/dev/null || true
fi

# Build new image
echo "Building new image..."
"${SCRIPT_DIR}/build.sh"

# Start new container
echo ""
echo "Starting new container..."
"${SCRIPT_DIR}/start.sh"

echo ""
echo "✓ Redeployment complete!"

