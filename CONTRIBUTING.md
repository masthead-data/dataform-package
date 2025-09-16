# Contributing to Dataform Reservation Plugin

We welcome contributions to the Dataform Plugin! This document provides guidelines for contributing to the project.

## Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/masthead-data/dataform-plugin.git
   cd dataform-plugin
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run tests:**

   ```bash
   npm test
   ```

4. **Run linting:**

   ```bash
   npm run lint
   ```

## Project Structure

```filetree
dataform-plugin/
├── index.js              # Main plugin code
├── test/
│   └── index.test.js     # Test suite
├── package.json          # Package configuration
├── README.md             # Main documentation
├── CHANGELOG.md          # Version history
└── .eslintrc.js          # ESLint configuration
```

## Making Changes

### 1. Code Style

- Follow the existing code style
- Use ESLint for code formatting: `npm run lint`
- Write meaningful commit messages
- Include tests for new functionality

### 2. Testing

- Write comprehensive tests for any new features
- Ensure all existing tests pass: `npm test`
- Aim for high test coverage
- Test edge cases and error conditions

### 3. Documentation

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

1. Update version in `package.json`
2. Update `CHANGELOG.md` with new version details
3. Create a git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. Publish to npm: `npm publish`

## Questions?

If you have questions about contributing, please:

1. Check existing issues and documentation
2. Open a new issue for discussion
3. Contact the maintainers

Thank you for contributing to the Dataform Reservation Plugin!
