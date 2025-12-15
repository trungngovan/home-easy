# Contributing to Home Easy

Thank you for your interest in contributing to Home Easy! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. **Fork the repository** and clone your fork
2. **Set up the development environment** following the instructions in [README.md](./README.md)
3. **Create a branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bugfix-name
   ```

## Development Workflow

### Backend Development

1. **Follow Django best practices**:
   - Use meaningful model and variable names
   - Write docstrings for classes and functions
   - Keep functions focused and single-purpose
   - Use Django's built-in features when possible

2. **Database changes**:
   - Always create migrations for model changes
   - Test migrations both forward and backward
   - Never edit existing migrations

3. **API design**:
   - Follow RESTful conventions
   - Use appropriate HTTP methods
   - Return consistent response formats
   - Document endpoints in docstrings

4. **Testing**:
   - Write tests for new features
   - Ensure all tests pass before submitting
   ```bash
   cd backend
   python manage.py test
   ```

### Frontend Development

1. **Follow React/Next.js best practices**:
   - Use TypeScript for type safety
   - Keep components small and focused
   - Use meaningful component and variable names
   - Follow the existing code style

2. **Styling**:
   - Use Tailwind CSS utility classes
   - Follow Ant Design component patterns
   - Maintain consistent spacing and typography

3. **Code quality**:
   - Run linter before committing
   ```bash
   cd frontend
   npm run lint
   ```

## Commit Guidelines

- Write clear, descriptive commit messages
- Use present tense ("Add feature" not "Added feature")
- Reference issue numbers when applicable
- Keep commits focused and atomic

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Example**:
```
feat(billing): Add automatic invoice generation

Implement automatic invoice generation based on meter readings
and service pricing. Includes background task scheduling.

Closes #123
```

## Pull Request Process

1. **Update documentation** if you've changed functionality
2. **Add tests** for new features or bug fixes
3. **Ensure all tests pass** and code is properly formatted
4. **Update CHANGELOG.md** with your changes
5. **Create a pull request** with a clear description:
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
   - Screenshots (if UI changes)

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No new warnings introduced
- [ ] CHANGELOG.md updated

## Code Style

### Python (Backend)

- Follow PEP 8 style guide
- Use type hints where appropriate
- Maximum line length: 100 characters
- Use `black` or similar formatter (if configured)

### TypeScript/JavaScript (Frontend)

- Follow ESLint configuration
- Use TypeScript for type safety
- Prefer functional components and hooks
- Use meaningful variable and function names

## Project Structure

- Keep related code together
- Follow the existing directory structure
- Don't create unnecessary abstractions
- Keep files focused and reasonably sized

## Questions?

If you have questions or need clarification:
- Open an issue for discussion
- Check existing documentation
- Review similar code in the codebase

Thank you for contributing to Home Easy! 🎉
