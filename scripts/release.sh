#!/bin/bash

# This script bumps the version, creates a git tag, and pushes to origin.
# Usage: npm run release --tag_version=[patch|minor|major|x.y.z]
# Or: ./scripts/release.sh [patch|minor|major|x.y.z]

INPUT=$1

# If input is not passed as an argument, try to get it from npm config
if [ -z "$INPUT" ]; then
  INPUT=$npm_config_tag_version
fi

if [ -z "$INPUT" ]; then
  echo "Error: tag_version parameter is required."
  echo "Usage: npm run release --tag_version=[patch|minor|major|x.y.z]"
  exit 1
fi

echo "Running npm version $INPUT..."

# npm version handles:
# 1. Bumping version in package.json and package-lock.json
# 2. Committing the changes
# 3. Creating a git tag (e.g., v0.2.1)
# Note: npm version will fail if the working directory is not clean.
NEW_VERSION_TAG=$(npm version "$INPUT")

if [ $? -eq 0 ]; then
  echo "✓ Successfully created version $NEW_VERSION_TAG"
  
  # Push the commit and the tag
  CURRENT_BRANCH=$(git branch --show-current)
  echo "Pushing changes and tag to origin $CURRENT_BRANCH..."
  
  # Push the current branch and the new tag
  git push origin "$CURRENT_BRANCH" && git push origin "$NEW_VERSION_TAG"
  
  if [ $? -eq 0 ]; then
    echo "✓ Successfully pushed changes and $NEW_VERSION_TAG to origin"
  else
    echo "Error: Failed to push to origin"
    exit 1
  fi
else
  echo "Error: npm version $INPUT failed"
  exit 1
fi
