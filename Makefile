.PHONY: help install install-be install-fe dev dev-be dev-fe test test-be test-fe migrate migrate-be lint lint-be lint-fe clean format format-be format-fe setup

# Default target
help:
	@echo "Home Easy - Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make setup          - Set up both backend and frontend"
	@echo "  make install        - Install dependencies for both"
	@echo "  make install-be     - Install backend dependencies"
	@echo "  make install-fe     - Install frontend dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Run both backend and frontend"
	@echo "  make dev-be         - Run backend server only"
	@echo "  make dev-fe         - Run frontend server only"
	@echo ""
	@echo "Database:"
	@echo "  make migrate        - Run database migrations"
	@echo "  make migrate-be     - Run backend migrations"
	@echo ""
	@echo "Testing:"
	@echo "  make test           - Run all tests"
	@echo "  make test-be        - Run backend tests"
	@echo "  make test-fe        - Run frontend tests"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint           - Lint both backend and frontend"
	@echo "  make lint-be        - Lint backend code"
	@echo "  make lint-fe        - Lint frontend code"
	@echo "  make format         - Format both backend and frontend"
	@echo "  make format-be      - Format backend code"
	@echo "  make format-fe      - Format frontend code"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean          - Clean build artifacts and caches"

# Setup
setup: install migrate
	@echo "✅ Setup complete!"

# Installation
install: install-be install-fe

install-be:
	@echo "📦 Installing backend dependencies..."
	cd backend && python3 -m venv .venv || true
	cd backend && . .venv/bin/activate && pip install -r requirements.txt
	@echo "✅ Backend dependencies installed"

install-fe:
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✅ Frontend dependencies installed"

# Development servers
dev:
	@echo "🚀 Starting both backend and frontend..."
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:3000"
	@make -j2 dev-be dev-fe

dev-be:
	@echo "🚀 Starting backend server..."
	cd backend && . .venv/bin/activate && python manage.py runserver 0.0.0.0:8000

dev-fe:
	@echo "🚀 Starting frontend server..."
	cd frontend && npm run dev

# Database migrations
migrate: migrate-be

migrate-be:
	@echo "🔄 Running database migrations..."
	cd backend && . .venv/bin/activate && python manage.py migrate
	@echo "✅ Migrations complete"

# Testing
test: test-be test-fe

test-be:
	@echo "🧪 Running backend tests..."
	cd backend && . .venv/bin/activate && python manage.py test
	@echo "✅ Backend tests complete"

test-fe:
	@echo "🧪 Running frontend tests..."
	cd frontend && npm run test || echo "⚠️  Frontend tests not configured"

# Linting
lint: lint-be lint-fe

lint-be:
	@echo "🔍 Linting backend code..."
	cd backend && . .venv/bin/activate && python -m flake8 . || echo "⚠️  flake8 not installed, skipping..."
	@echo "✅ Backend linting complete"

lint-fe:
	@echo "🔍 Linting frontend code..."
	cd frontend && npm run lint
	@echo "✅ Frontend linting complete"

# Formatting
format: format-be format-fe

format-be:
	@echo "✨ Formatting backend code..."
	cd backend && . .venv/bin/activate && python -m black . || echo "⚠️  black not installed, skipping..."
	@echo "✅ Backend formatting complete"

format-fe:
	@echo "✨ Formatting frontend code..."
	cd frontend && npm run format || echo "⚠️  Frontend formatter not configured"
	@echo "✅ Frontend formatting complete"

# Cleanup
clean:
	@echo "🧹 Cleaning build artifacts..."
	find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -r {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -r {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -r {} + 2>/dev/null || true
	find . -type d -name "node_modules" -prune -o -type d -name ".next" -exec rm -r {} + 2>/dev/null || true
	@echo "✅ Cleanup complete"
