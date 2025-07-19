# InsureWise Backend Development Setup

This document provides instructions for setting up and running the InsureWise backend API.

## Quick Start

1. **Install Dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Environment Setup**:
   - Copy `.env.example` to `.env`
   - Update the environment variables, especially:
     - `MONGODB_URI` - Your MongoDB connection string
     - `JWT_SECRET` - A strong, random secret for JWT tokens
     - `JWT_REFRESH_SECRET` - Another strong secret for refresh tokens

3. **Start MongoDB**:
   - Make sure MongoDB is running on your system
   - Default connection: `mongodb://localhost:27017/insurewise`

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

## Current Implementation Status

### ✅ Completed Features:

1. **Project Structure & Configuration**
   - TypeScript setup with proper tsconfig
   - Express.js server configuration
   - Environment variable management
   - Package.json with all necessary dependencies

2. **Database Models**
   - User model with authentication fields
   - Wallet model with transaction tracking
   - Transaction model with comprehensive logging

3. **Authentication System**
   - JWT-based authentication
   - Refresh token mechanism
   - Password hashing with bcrypt
   - Role-based access control

4. **Middleware**
   - Authentication middleware
   - Error handling middleware
   - Rate limiting
   - CORS and security headers

5. **Logging System**
   - Winston logger with daily rotation
   - Structured logging with metadata
   - Different log levels for different environments

6. **API Routes Structure**
   - Authentication routes (register, login, refresh, logout)
   - Basic route structure for other modules

### 🚧 Next Steps to Implement:

1. **User Management Controller**
   - Complete user profile management
   - Profile picture upload
   - User settings management

2. **Wallet Functionality**
   - Wallet balance queries
   - Transaction history
   - Fund wallet operations

3. **Claims Management**
   - Claim submission with file upload
   - Mock ML analysis integration
   - Claim status management

4. **Group Savings (Ajo-style)**
   - Group creation and management
   - Member joining and contribution tracking
   - Savings distribution logic

5. **Payment Integration**
   - Paystack integration for wallet funding
   - Payment verification
   - Webhook handling

6. **Cashback System**
   - 3-month and 6-month cashback calculations
   - Automatic cashback crediting
   - Cashback history tracking

## API Testing

You can test the API endpoints using tools like Postman or curl:

### Register a new user:
```bash
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890"
}
```

### Login:
```bash
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

## Database Schema

### User Collection
- Authentication fields (email, password, phone)
- Personal information (firstName, lastName, dateOfBirth, address)
- Verification status (email, phone)
- Role and account status

### Wallet Collection
- User reference
- Balance and currency
- Transaction references
- Active status

### Transaction Collection
- Wallet and user references
- Transaction type (credit/debit)
- Amount and currency
- Description and reference
- Status and metadata

## Security Features

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with expiration
- Rate limiting (100 requests per 15 minutes)
- Input validation with express-validator
- CORS and security headers with helmet
- MongoDB injection protection

## Development Commands

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run build:watch  # Build in watch mode
npm start           # Start production server
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint errors
```

## Environment Variables Reference

```bash
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/insurewise

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_here
JWT_REFRESH_EXPIRES_IN=30d

# Security
BCRYPT_SALT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Paystack (for future payment integration)
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# Insurance Business Logic
CASHBACK_3_MONTHS_PERCENTAGE=5
CASHBACK_6_MONTHS_PERCENTAGE=10
DEFAULT_WALLET_BALANCE=0
```

## Troubleshooting

1. **"Cannot find module" errors**: Run `npm install` to ensure all dependencies are installed
2. **Database connection errors**: Make sure MongoDB is running and the connection string is correct
3. **JWT errors**: Ensure JWT secrets are set in environment variables
4. **Port already in use**: Change the PORT in .env file or kill the process using the port

## Next Development Session

To continue development:
1. Implement user management controllers
2. Add wallet functionality with Paystack integration
3. Build claims management system
4. Create group savings features
5. Add comprehensive testing
6. Set up deployment configuration
