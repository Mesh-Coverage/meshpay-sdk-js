# Contributing to Meshpay SDK

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the Meshpay SDK.

## Code of Conduct

Be respectful and inclusive. We welcome all contributors regardless of experience level.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/meshpay-sdk-js.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build TypeScript
npm run build

# Lint code
npm run lint
```

## Making Changes

### Code Style

- Follow the existing code style in the repository
- Use TypeScript for all new code
- Write clear, descriptive variable and function names
- Add JSDoc comments for public APIs

### Commits

- Use clear, descriptive commit messages
- Reference issue numbers when applicable: `fix: resolve null reference (#123)`
- Follow conventional commit format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `test:` for tests
  - `refactor:` for code refactoring
  - `chore:` for build/dependency changes

### Tests

- Write tests for new features and bug fixes
- Ensure all tests pass: `npm test`
- Aim for good test coverage
- Tests should be in `src/__tests__/` directory

### Documentation

- Update README.md for new features
- Add JSDoc comments to functions and classes
- Update CHANGELOG.md with your changes
- Include examples for new features

## Submitting Changes

1. Push to your fork: `git push origin feature/your-feature-name`
2. Open a Pull Request with a clear title and description
3. Reference any related issues
4. Ensure CI passes (tests, linting)
5. Request review from maintainers

## Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Include tests and documentation
- Update CHANGELOG.md
- Follow the existing code style
- Provide a clear description of changes

## Reporting Issues

When reporting issues, please include:

- Clear description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Node.js version
- SDK version
- Error messages or logs

## Feature Requests

Feature requests are welcome! Please include:

- Clear description of the desired feature
- Use case and motivation
- Example usage (if applicable)
- Any alternatives considered

## Release Process

The maintainers handle releases. For version numbering, we follow [Semantic Versioning](https://semver.org/):

- `MAJOR.MINOR.PATCH` (e.g., 1.2.3)
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

## Questions?

Feel free to open an issue with your question, or contact the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Meshpay SDK! 🎉
