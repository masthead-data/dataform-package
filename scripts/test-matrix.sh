#!/bin/bash
set -e

# Use provided arguments as versions, or default to the full matrix
if [ $# -gt 0 ]; then
  VERSIONS=("$@")
else
  VERSIONS=("2.4.2" "3.0.43" "local")
fi

# Setup local path constant
DATAFORM_LOCAL_PATH="${DATAFORM_LOCAL_PATH:-/Users/maxostapenko/GitHub/dataform}"

# Cleanup function to restore configuration files
cleanup() {
  if [ -f "dataform.json.bak" ]; then
    echo "Restoring dataform.json"
    mv "dataform.json.bak" "dataform.json"
  fi
  if [ -f "workflow_settings.yaml.bak" ]; then
    echo "Restoring workflow_settings.yaml"
    mv "workflow_settings.yaml.bak" "workflow_settings.yaml"
  fi
}

# Ensure cleanup runs on exit (including failures)
trap cleanup EXIT INT TERM

# Run jest first to ensure the package is working
npx jest

echo "Running matrix tests across Dataform versions..."
cd test-project

for VERSION in "${VERSIONS[@]}"; do
  echo ""
  echo "========================================="
  echo "Testing with Dataform $VERSION"
  echo "========================================="

  # Configuration management based on version
  if [[ $VERSION == 3* || $VERSION == "local" ]]; then
    if [ -f "dataform.json" ]; then
      echo "Hiding dataform.json for v3 compatibility"
      mv dataform.json dataform.json.bak
    fi
  elif [[ $VERSION == 2* ]]; then
    if [ -f "workflow_settings.yaml" ]; then
      echo "Hiding workflow_settings.yaml for v2 compatibility"
      mv workflow_settings.yaml workflow_settings.yaml.bak
    fi
  fi

  # Clean up previously installed versions to avoid conflicts
  # echo "Cleaning up previous @dataform installations..."
  # npm uninstall @dataform/cli @dataform/core --no-save > /dev/null 2>&1 || true

  if [[ "$VERSION" == "local" ]]; then
    echo "Using local Dataform dependency from $DATAFORM_LOCAL_PATH..."
    npm install "$DATAFORM_LOCAL_PATH/bazel-bin/packages/@dataform/cli/package" "$DATAFORM_LOCAL_PATH/bazel-bin/packages/@dataform/core/package" --no-save
  else
    echo "Installing Dataform @$VERSION..."
    # Use --no-save to avoid cluttering package.json/package-lock.json during matrix tests
    npm install @dataform/cli@$VERSION @dataform/core@$VERSION --no-save
  fi

  # Run tests using the single version command equivalent but passing the version
  npx @dataform/cli compile --json --vars=DATAFORM_VERSION=$VERSION > compiled.json
  node ../scripts/verify_compilation.js $VERSION

  # Restore files after the run so the next version has a clean state
  cleanup

  echo "✓ Dataform $VERSION tests passed"
done

cd ..

echo ""
echo "========================================="
echo "All matrix tests passed!"
echo "========================================="

