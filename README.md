# Home Easy

A comprehensive property management system designed for landlords, property managers, and tenants. Built with a modern tech stack, Home Easy streamlines property operations including billing, maintenance requests, tenant management, and automated invoicing.

## 🏗️ Architecture

Home Easy follows a modular, domain-driven architecture with clear separation between backend API and frontend applications. The system is designed with MVP-first principles and AI-ready extensibility for future enhancements like OCR-based meter reading and NLP-powered maintenance categorization.

### Tech Stack

#### Backend
- **Framework**: Django 6.0 with Django REST Framework
- **Authentication**: JWT (Simple JWT) with Google OAuth integration
- **API Documentation**: OpenAPI/Swagger (drf-spectacular)
- **Database**: SQLite (development) / PostgreSQL (production-ready)
- **Additional Libraries**:
  - `django-cors-headers` - CORS handling
  - `django-filter` - Advanced filtering
  - `reportlab` - PDF generation
  - `google-auth` - Google OAuth verification

#### Frontend
- **Framework**: Next.js 16.0.8 (App Router)
- **UI Library**: Ant Design 6.1.0
- **Styling**: Tailwind CSS 4.0
- **State Management**: TanStack Query (React Query)
- **Authentication**: Google OAuth via `@react-oauth/google`
- **Language**: TypeScript 5.x
- **Animations**: Framer Motion

## ✨ Features

### Core Functionality
- **Identity & Access Management**: Role-based authentication (Admin, Manager, Tenant, Tech) with Google OAuth
- **Property Management**: Multi-property support with room management and status tracking
- **Tenancy Management**: Contract management, tenant linking via invites, deposit tracking
- **Metering**: Manual meter reading input with OCR-ready architecture
- **Billing & Invoicing**: Automated invoice generation based on meter readings and service pricing
- **Payment Processing**: Payment tracking and status management (gateway-ready)
- **Maintenance Requests**: Request submission, assignment, and status tracking
- **Notifications**: Multi-channel notification system (in-app, email, push-ready)
- **File Management**: Secure file storage for contracts, invoices, and maintenance attachments
- **Audit Logging**: Comprehensive audit trail for all operations

### User Roles
- **Landlord/Accountant**: Full property and financial oversight
- **Operations Manager**: Property operations and maintenance coordination
- **Maintenance Tech**: Maintenance request handling and status updates
- **Tenant**: View invoices, submit payments, request maintenance

## 📁 Project Structure

```
home-easy/
├── backend/                 # Django REST API
│   ├── identity/           # User authentication & authorization
│   ├── properties/         # Property and room management
│   ├── tenancies/          # Tenant contracts and relationships
│   ├── pricing/            # Service pricing configuration
│   ├── metering/           # Meter reading management
│   ├── billing/            # Invoice generation and management
│   ├── payments/           # Payment processing
│   ├── maintenance/        # Maintenance request system
│   ├── files/              # File asset management
│   ├── invites/            # Tenant invitation system
│   ├── notifications/       # Notification service
│   └── audit/              # Audit logging
├── frontend/               # Next.js web application
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   └── lib/           # Utilities and API client
├── diagrams/               # Architecture and database diagrams
├── plan/                   # Development phases and planning
├── .github/                # GitHub templates and workflows
│   ├── workflows/         # CI/CD workflows
│   └── ISSUE_TEMPLATE/    # Issue templates
├── LICENSE                 # MIT License
├── CONTRIBUTING.md         # Contribution guidelines
├── CHANGELOG.md            # Version history
├── SECURITY.md             # Security policy
├── Makefile                # Development commands
├── docker-compose.yml      # Docker setup for local development
├── .editorconfig           # Editor configuration
└── .prettierrc             # Code formatting rules
```

## 🚀 Getting Started

### Prerequisites

- **Backend**:
  - Python 3.13+
  - pip (Python package manager)
  - Virtual environment support

- **Frontend**:
  - Node.js 20+ (or compatible version)
  - npm, yarn, pnpm, or bun

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   Create a `.env` file in the `backend/` directory:
   ```env
   DJANGO_SECRET_KEY=your-secret-key-here
   DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
   GOOGLE_CLIENT_ID_WEB=your-google-client-id-web
   GOOGLE_CLIENT_ID_ANDROID=your-google-client-id-android
   GOOGLE_CLIENT_ID_IOS=your-google-client-id-ios
   ```

5. **Run database migrations**:
   ```bash
   python manage.py migrate
   ```

6. **Create superuser (optional)**:
   ```bash
   python manage.py createsuperuser
   ```

7. **Start development server**:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure environment variables**:
   Create a `.env.local` file in the `frontend/` directory:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-web
   ```

4. **Start development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

The application will be available at `http://localhost:3000`

## 📚 API Documentation

Once the backend server is running, API documentation is available at:

- **OpenAPI Schema**: `http://localhost:8000/api/schema/`
- **Swagger UI**: `http://localhost:8000/api/docs/`

The API follows RESTful principles and uses JWT authentication. Include the access token in the `Authorization` header:

```
Authorization: Bearer <your-access-token>
```

## 🔐 Authentication

Home Easy supports multiple authentication methods:

### Google OAuth
- Web, Android, and iOS client IDs are supported
- Endpoints:
  - `POST /api/auth/google/` - General Google OAuth
  - `POST /api/auth/google/web/` - Web-specific OAuth (landlord access)

### JWT Authentication
- Access and refresh token-based authentication
- Token refresh endpoint: `POST /api/auth/token/refresh/`
- User profile: `GET /api/auth/me/`

## 🧪 Testing

### Backend Testing
```bash
cd backend
python manage.py test
```

### Frontend Testing
```bash
cd frontend
npm run lint
```

### Production smoke checklist (post-deploy)
- Open `https://<vercel-domain>/` and ensure SSR pages render.
- Trigger an authenticated API call (e.g., login) and confirm `200` from Railway backend.
- Confirm CORS/CSRF: no blocked requests from Vercel domain.
- Verify DB connection: `python manage.py migrate` ran against Supabase; sample query via `/api/auth/me/`.
- If using Google login, verify OAuth redirect/ID token validation in prod.
- If serving static via app, ensure `collectstatic` assets load (or use external storage).

## 🛠️ Development Workflow

### Using Makefile

The project includes a `Makefile` with convenient commands:

```bash
# Set up the entire project
make setup

# Run both backend and frontend
make dev

# Run migrations
make migrate

# Run tests
make test

# Lint code
make lint

# Format code
make format

# Clean build artifacts
make clean
```

See `make help` for all available commands.

### Manual Development

1. **Backend Development**:
   - Make changes in the appropriate Django app
   - Create migrations: `python manage.py makemigrations`
   - Apply migrations: `python manage.py migrate`
   - Test API endpoints via Swagger UI or API client

2. **Frontend Development**:
   - Make changes in `src/app/` for pages or `src/lib/` for utilities
   - The development server supports hot-reloading
   - API client configuration is in `src/lib/api.ts`

3. **Database Changes**:
   - Always create migrations for model changes
   - Review migration files before committing
   - Test migrations on a copy of production data when possible

### Docker Development

For containerized development, use Docker Compose:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Django backend on port 8000
- Next.js frontend on port 3000

### Code Quality

- **EditorConfig**: The project uses `.editorconfig` for consistent code formatting across editors
- **Prettier**: Frontend code formatting is configured via `.prettierrc`
- **Linting**: Run `make lint` to check code quality
- **Formatting**: Run `make format` to auto-format code

## 📦 Key Dependencies

### Backend
- `Django==6.0` - Web framework
- `djangorestframework==3.16.1` - REST API toolkit
- `drf-spectacular==0.29.0` - OpenAPI schema generation
- `djangorestframework-simplejwt==5.5.1` - JWT authentication
- `django-cors-headers==4.6.0` - CORS middleware
- `django-filter==25.1` - Advanced filtering
- `reportlab==4.2.5` - PDF generation
- `google-auth==2.38.0` - Google OAuth verification

### Frontend
- `next==16.0.8` - React framework
- `react==19.2.1` - UI library
- `antd==6.1.0` - UI component library
- `@tanstack/react-query==5.90.12` - Data fetching and state management
- `tailwindcss==4` - Utility-first CSS framework
- `typescript==5` - Type safety

## 🔄 Database

The project uses SQLite for development, which makes it easy to get started. The architecture is designed to easily migrate to PostgreSQL for production:

- All models use Django ORM with proper relationships
- Migrations are version-controlled
- Database configuration is environment-based

## 📝 Environment Variables

### Backend (`.env`)
- `DATABASE_URL` - Supabase Postgres URL (append `?sslmode=require` in prod)
- `DJANGO_SECRET_KEY` - Django secret key
- `DJANGO_DEBUG` - `true|false`
- `DJANGO_ALLOWED_HOSTS` - Comma-separated list of allowed hosts
- `DJANGO_CSRF_TRUSTED_ORIGINS` - Comma-separated trusted origins (include Vercel/Railway domains)
- `CORS_ALLOWED_ORIGINS` - Comma-separated allowed origins (include Vercel domain)
- `GOOGLE_CLIENT_ID_WEB` / `GOOGLE_CLIENT_ID_ANDROID` / `GOOGLE_CLIENT_ID_IOS`

### Frontend (`.env.local`)
- `NEXT_PUBLIC_API_BASE_URL` - API base (`/api` when using Vercel rewrite, or full URL)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth client ID for web
- `API_BASE_URL` (private) - Backend base URL for Vercel rewrite target (Railway)

## 🚧 Development Status

This project is in active development following an MVP-first approach. Current focus areas:

- Core property and tenant management
- Billing and invoicing automation
- Maintenance request workflow
- Notification system
- AI-ready architecture for future OCR/NLP integration

See `plan/phases.md` for detailed development roadmap.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details on:

- Code of conduct
- Development workflow
- Commit message guidelines
- Pull request process
- Code style standards

## 🔒 Security

For security concerns, please review our [Security Policy](./SECURITY.md) and report vulnerabilities responsibly.

## 📝 Additional Documentation

- [Contributing Guidelines](./CONTRIBUTING.md) - How to contribute to the project
- [Security Policy](./SECURITY.md) - Security reporting and best practices
- [Changelog](./CHANGELOG.md) - Version history and changes
- [Backend README](./backend/README.md) - Backend-specific documentation
- [Frontend README](./frontend/README.md) - Frontend-specific documentation
- [Development Phases](./plan/phases.md) - Project roadmap and phases

---

**Built with ❤️ for property management**
