# Contributing to ExpenseFlow

Thank you for your interest in contributing to ExpenseFlow!

## Code of Conduct

Be respectful, inclusive, and constructive. We're here to build great software together.

## How to Contribute

### Reporting Bugs

Open an issue with:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, browser)

### Suggesting Features

Open an issue with:
- Clear description of the feature
- Use case and motivation
- Proposed implementation (if any)

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Run linter (`npm run lint`)
6. Commit with clear message (`git commit -m 'Add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## Development Setup

```bash
git clone https://github.com/yourusername/expenseflow.git
cd expenseflow
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev
```

## Code Style

- Use ESLint configuration provided
- Follow existing patterns
- Write tests for new features
- Update documentation

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Formatting changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks
