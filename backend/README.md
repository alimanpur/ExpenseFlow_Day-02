# ExpenseFlow Backend API

**Split Smarter. Settle Faster.**

ExpenseFlow is a premium collaborative expense management platform. This is the production-ready backend API built with Node.js, Express, and MongoDB.

## Tech Stack

- **Runtime:** Node.js (>=18 LTS)
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (Access + Refresh Tokens)
- **Validation:** Zod
- **File Upload:** Multer + Cloudinary
- **Security:** Helmet, CORS, Rate Limiting, bcryptjs
- **Logging:** Morgan + Custom Logger
- **Real-time:** Socket.io (ready for future integration)

## Project Structure

```
backend/
├── src/
│   ├── config/          # App configuration & database connection
│   ├── constants/       # Enums, roles, permissions, status codes
│   ├── controllers/     # HTTP request handlers (thin layer)
│   ├── middleware/      # Auth, validation, error handling, upload
│   ├── models/          # Mongoose schemas (12 collections)
│   ├── routes/          # Express route definitions
│   ├── services/        # Business logic layer
│   ├── validators/      # Zod validation schemas
│   ├── utils/           # Helpers, API response, error classes
│   ├── jobs/            # Background jobs (future)
│   ├── sockets/         # WebSocket handlers (future)
│   ├── types/           # Type definitions (future)
│   ├── lib/             # Third-party integrations
│   ├── app.js           # Express app setup
│   └── server.js        # Entry point with graceful shutdown
├── tests/               # Test files
├── uploads/             # Local file uploads
├── docs/                # Documentation
├── .env.example         # Environment variables template
└── package.json
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# Set MONGODB_URI, JWT secrets, etc.

# Start development server
npm run dev
```

### Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_ACCESS_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `CORS_ORIGIN` - Frontend URL for CORS
- `RESEND_API_KEY` - Resend email service API key
- `EMAIL_FROM` - Sender email address
- `EMAIL_FROM_NAME` - Sender display name
- `APP_URL` - Application URL for email links

## API Endpoints

### Health Check
```
GET /api/v1/health
```

### Authentication
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh-token
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/change-password
GET    /api/v1/auth/profile
PATCH  /api/v1/auth/profile
```

### Circles
```
POST   /api/v1/circles
GET    /api/v1/circles
GET    /api/v1/circles/:circleId
PATCH  /api/v1/circles/:circleId
DELETE /api/v1/circles/:circleId
PATCH  /api/v1/circles/:circleId/archive
GET    /api/v1/circles/:circleId/members
POST   /api/v1/circles/:circleId/invite
DELETE /api/v1/circles/:circleId/members/:memberId
POST   /api/v1/circles/:circleId/leave
POST   /api/v1/circles/:circleId/transfer-ownership
GET    /api/v1/circles/:circleId/invitations
GET    /api/v1/circles/invitations
POST   /api/v1/circles/invitations/:token/accept
POST   /api/v1/circles/invitations/:token/decline
```

### Expenses
```
POST   /api/v1/expenses
GET    /api/v1/expenses/me
GET    /api/v1/expenses/circle/:circleId
GET    /api/v1/expenses/:expenseId
PATCH  /api/v1/expenses/:expenseId
DELETE /api/v1/expenses/:expenseId
```

### Settlements
```
GET    /api/v1/settlements/balances/:circleId
GET    /api/v1/settlements/suggested/:circleId
GET    /api/v1/settlements/history/:circleId
POST   /api/v1/settlements
POST   /api/v1/settlements/:settlementId/confirm
POST   /api/v1/settlements/:settlementId/cancel
```

### Search
```
GET    /api/v1/search?q=<query>&type=<type>
```

### Notifications
```
GET    /api/v1/notifications
PATCH  /api/v1/notifications/:notificationId/read
PATCH  /api/v1/notifications/read-all
DELETE /api/v1/notifications/:notificationId
```

## Database Schema

### Collections
- **Users** - User accounts, authentication, preferences
- **Circles** - Groups for sharing expenses
- **Members** - Circle membership with roles and balances
- **Expenses** - Expense records with split methods
- **ExpenseSplits** - Individual share allocations
- **Settlements** - Payment settlements between users
- **Invitations** - Circle invitations
- **Notifications** - User notifications
- **ActivityLogs** - Activity feed entries
- **Categories** - Expense categories
- **Transactions** - Financial transaction records
- **AuditLogs** - Immutable audit trail

## Authentication Flow

1. **Register** - User creates account → receives verification email
2. **Login** - Returns access token (15min) + refresh token (7 days)
3. **Authenticate** - Access token in Authorization header or cookie
4. **Refresh** - Use refresh token to get new access token
5. **Logout** - Invalidates refresh token

## Security Features

- Helmet for HTTP headers
- CORS with whitelisted origins
- Rate limiting (global + auth-specific)
- Password hashing with bcrypt (12 rounds)
- JWT with short-lived access tokens
- Refresh token rotation
- Account lockout after 5 failed attempts
- Input validation with Zod
- MongoDB injection prevention
- Cookie security
- Soft delete support

## Scripts

```bash
npm start          # Production start
npm run dev        # Development with nodemon
npm test           # Run tests
npm run lint       # Lint code
npm run format     # Format code with Prettier
```

## License

MIT