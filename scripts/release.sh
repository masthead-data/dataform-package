#!/bin/bash

# This script creates a git tag and pushes it to origin.
# Usage: npm run release --tag_version=x.y.z
# Or: ./scripts/release.sh x.y.z

VERSION=$1

# If version is not passed as an argument, try to get it from npm config
if [ -z "$VERSION" ]; then
  VERSION=$npm_config_tag_version
fi

if [ -z "$VERSION" ]; then
  echo "Error: tag_version parameter is required."
  echo "Usage: npm run release --tag_version=x.y.z"
  exit 1
fi

# Remove 'v' prefix if present
VERSION=$(echo $VERSION | sed 's/^v//')

echo "Creating release tag v$VERSION..."

# Check if tag already exists
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
  echo "Error: Tag v$VERSION already exists."
  exit 1
fi

# Create and push the tag
git tag -a "v$VERSION" -m "Release v$VERSION"
if [ $? -eq 0 ]; then
  git push origin "v$VERSION"
  echo "✓ Successfully added and pushed tag v$VERSION"
else
  echo "Error: Failed to create tag v$VERSION"
  exit 1
fi
