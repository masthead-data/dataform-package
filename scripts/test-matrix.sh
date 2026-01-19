#!/bin/bash
set -e

# Use provided arguments as versions, or default to the full matrix
if [ $# -gt 0 ]; then
  VERSIONS=("$@")
else
  VERSIONS=("2.4.2" "3.0.42")
fi

# Cleanup function to restore configuration files
cleanup() {
  if [ -f "test-project/dataform.json.bak" ]; then
    echo "Restoring dataform.json"
    mv "test-project/dataform.json.bak" "test-project/dataform.json"
  fi
  if [ -f "test-project/workflow_settings.yaml.bak" ]; then
    echo "Restoring workflow_settings.yaml"
    mv "test-project/workflow_settings.yaml.bak" "test-project/workflow_settings.yaml"
  fi
}

# Ensure cleanup runs on exit (including failures)
trap cleanup EXIT INT TERM

echo "Running matrix tests across Dataform versions..."

for VERSION in "${VERSIONS[@]}"; do
  echo ""
  echo "========================================="
  echo "Testing with Dataform v$VERSION"
  echo "========================================="

  # Configuration management based on version
  if [[ $VERSION == 3* ]]; then
    if [ -f "test-project/dataform.json" ]; then
      echo "Hiding dataform.json for v3 compatibility"
      mv test-project/dataform.json test-project/dataform.json.bak
    fi
  elif [[ $VERSION == 2* ]]; then
    if [ -f "test-project/workflow_settings.yaml" ]; then
      echo "Hiding workflow_settings.yaml for v2 compatibility"
      mv test-project/workflow_settings.yaml test-project/workflow_settings.yaml.bak
    fi
  fi

  # Install specific version
  echo "Installing Dataform @$VERSION..."
  cd test-project
  # Use --no-save to avoid cluttering package.json/package-lock.json during matrix tests
  npm install @dataform/cli@$VERSION @dataform/core@$VERSION --no-save
  cd ..

  # Run tests using the single version command
  npm run test:single

  # Restore files after the run so the next version has a clean state
  cleanup

  echo "✓ Dataform v$VERSION tests passed"
done

echo ""
echo "========================================="
echo "All matrix tests passed!"
echo "========================================="

