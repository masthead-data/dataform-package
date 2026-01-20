# Contributing to Dataform package

We welcome contributions to the Dataform package! This document provides guidelines for contributing to the project.

## Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/masthead-data/dataform-package.git
   cd dataform-package
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run tests:**

   #### Matrix Testing (Default)
   Run from the root to test all supported versions:
   ```bash
   npm test
   ```
   This command iterates through all supported Dataform versions (currently v2.4.2 and v3.X.X), managing configuration file conflicts automatically.

   #### Single Version (Fast Iteration)
   For rapid development on the version currently installed in `test-project`:
   ```bash
   npm run test:single
   ```
   This runs:
   1. `jest`: Unit tests for helper functions.
   2. `dataform compile`: Generates the actual project graph.
   3. `verify_compilation.js`: In-depth JSON inspection.

   #### Specific Version
   Test a single Dataform version:
   ```bash
   npm test -- 2.4.2
   ```

4. **Run linting:**

   ```bash
   npm run lint
   ```

### Local Integration Testing
The `test-project` is configured to use the local version of the package. In `test-project/package.json`:
```json
"dependencies": {
  "@masthead-data/dataform-package": "file:../"
}
```
**Note:** `npm ci` or `npm install` in the `test-project` caches the local package. If you make changes to `index.js` and don't see them reflected, you may need to force an update or avoid `npm ci` during rapid iteration.

## Project Structure

```filetree
dataform-package/
├── index.js              # Main package code
├── test/
│   └── index.test.js     # Test suite
├── package.json          # Package configuration
├── README.md             # Main documentation
├── CHANGELOG.md          # Version history
└── .eslintrc.js          # ESLint configuration
```

## Making Changes

### 1. Lockfile Maintenance

This project uses `npm ci` in CI/CD pipelines, which requires `package-lock.json` to be perfectly in sync with `package.json`.

**Critical: Platform-Specific Bindings**
The project includes optional platform-specific dependencies (e.g., `@unrs/resolver-binding-*`). If you update dependencies on macOS, `npm` might "clean" other platform bindings from the lockfile, causing CI to fail on Linux.

If CI fails with `npm error EUSAGE` related to missing platform bindings:
1. Restore the `package-lock.json` to a known good state.
2. Run `npm install` to update the version/dependencies without removing optional bindings.
3. Verify that the lockfile still contains entries for `@unrs/resolver-binding-linux-*` before committing.

### 2. Code Style

- Follow the existing code style
- Use ESLint for code formatting: `npm run lint`
- Write meaningful commit messages
- Include tests for new functionality

### 3. Testing

- Write comprehensive tests for any new features
- Ensure all existing tests pass: `npm test`
- Aim for high test coverage
- Test edge cases and error conditions

### 4. Documentation

- Update README.md for new features
- Add examples for new functionality
- Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/) format
- Include JSDoc comments for new functions

## Submitting Changes

### 1. Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Add tests for your changes
5. Ensure tests pass: `npm test`
6. Run linting: `npm run lint`
7. Commit your changes: `git commit -m "Add your feature"`
8. Push to your fork: `git push origin feature/your-feature-name`
9. Submit a pull request

### 2. Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Include tests for new functionality
- Update documentation as needed
- Ensure CI passes

## Code Review Process

1. All submissions require review before merging
2. Reviews focus on:
   - Code quality and style
   - Test coverage
   - Documentation completeness
   - Backward compatibility

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS, etc.)
- Code examples if applicable

### Feature Requests

For feature requests, please provide:

- Clear description of the proposed feature
- Use case and business justification
- Proposed API or interface changes
- Backward compatibility considerations

## Release Process

1. Update `CHANGELOG.md` with version and changes following [Keep a Changelog](https://keepachangelog.com/) format.
2. Bump version in `package.json` () and `README.md`.
3. Run `npm test` to verify matrix tests pass across all supported Dataform versions.
4. Commit and push to a feature branch.
5. Create a Pull Request and ensure all CI checks pass.
6. Merge to `main`.
7. Execute the release script from the `main` branch: `npm run release --tag_version=x.y.z`.

## Questions?

If you have questions about contributing, please:

1. Check existing issues and documentation
2. Open a new issue for discussion
3. Contact the maintainers

Thank you for contributing to the Dataform package!
