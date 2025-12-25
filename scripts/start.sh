#!/bin/bash

# Start script for Technitium DNS Server App Configurator
# Starts a container using Docker or Podman

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_NAME="technitium-config"
IMAGE_NAME="technitium-app-configurator"
IMAGE_TAG="latest"
PORT="${PORT:-3000}"

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

# Check if container already exists
if ${CONTAINER_CMD} ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "Container ${CONTAINER_NAME} already exists."
    read -p "Do you want to remove and recreate it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping and removing existing container..."
        ${CONTAINER_CMD} stop ${CONTAINER_NAME} 2>/dev/null || true
        ${CONTAINER_CMD} rm ${CONTAINER_NAME} 2>/dev/null || true
    else
        echo "Starting existing container..."
        ${CONTAINER_CMD} start ${CONTAINER_NAME}
        echo ""
        echo "✓ Container started!"
        echo "Access the webapp at: http://localhost:${PORT}"
        exit 0
    fi
fi

# Check if image exists
if ! ${CONTAINER_CMD} images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${IMAGE_NAME}:${IMAGE_TAG}$"; then
    echo "Image ${IMAGE_NAME}:${IMAGE_TAG} not found."
    echo "Building image first..."
    "${SCRIPT_DIR}/build.sh"
fi

# Run the container
echo "Starting container..."
${CONTAINER_CMD} run -d \
    --name ${CONTAINER_NAME} \
    -p ${PORT}:80 \
    ${IMAGE_NAME}:${IMAGE_TAG}

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Container started successfully!"
    echo ""
    echo "Container name: ${CONTAINER_NAME}"
    echo "Access the webapp at: http://localhost:${PORT}"
    echo ""
    echo "To view logs:"
    echo "  ${CONTAINER_CMD} logs -f ${CONTAINER_NAME}"
    echo ""
    echo "To stop the container:"
    echo "  ${CONTAINER_CMD} stop ${CONTAINER_NAME}"
    echo ""
    echo "To remove the container:"
    echo "  ${CONTAINER_CMD} rm ${CONTAINER_NAME}"
else
    echo ""
    echo "✗ Failed to start container!"
    exit 1
fi

