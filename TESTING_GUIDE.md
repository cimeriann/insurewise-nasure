# 🧪 InsureWise API Testing Guide

This guide provides comprehensive demo data and testing instructions for all API endpoints.

## 🚀 Quick Start

### 1. Setup and Seed Database
```bash
# Install dependencies
npm install

# Seed database with demo data
npm run seed

# Start development server
npm run dev
```

### 2. Run Automated Tests
```bash
# Run all endpoint tests
npm run test:api
```

### 3. Manual Testing with HTTP Client
Use the `api-tests.http` file with REST Client extension in VS Code or any HTTP client.

## 📊 Demo Data Overview

### Users Created:
- **Regular User**: `john.doe@example.com` / `password123`
- **Admin User**: `admin@insurewise.com` / `password123`
- **Additional Users**: jane.smith@example.com, mike.johnson@example.com, sarah.wilson@example.com

### Data Generated:
- ✅ 5 Users with different roles and verification status
- ✅ 5 Wallets with random balances (₦10,000 - ₦60,000)
- ✅ 15+ Transactions (funding and spending)
- ✅ 10+ Claims with various statuses and types
- ✅ 2 Group Savings (one active, one draft)

## 🔗 API Endpoints to Test

### Authentication (`/api/v1/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /me` - Get current user
- `POST /refresh` - Refresh tokens
- `POST /logout` - Logout user

### Users (`/api/v1/users`)
- `GET /users` - Get all users (admin only)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user profile
- `PUT /users/:id/password` - Change password

### Wallet (`/api/v1/wallet`)
- `GET /wallet` - Get user wallet
- `POST /wallet/fund` - Fund wallet
- `GET /wallet/transactions` - Get transactions
- `GET /wallet/transactions/:id` - Get transaction by ID

### Claims (`/api/v1/claims`)
- `POST /claims` - Submit new claim
- `GET /claims` - Get user claims
- `GET /claims/:id` - Get claim by ID
- `PUT /claims/:id/status` - Update claim status (admin)
- `GET /claims/admin/all` - Get all claims (admin)

### Group Savings (`/api/v1/groups`)
- `POST /groups` - Create new group
- `GET /groups` - Get all groups
- `GET /groups/:id` - Get group by ID
- `POST /groups/:id/join` - Join group
- `POST /groups/:id/leave` - Leave group
- `POST /groups/:id/contribute` - Make contribution
- `GET /groups/:id/contributions` - Get contributions

### Payments (`/api/v1/payments`)
- `POST /payments/initialize` - Initialize payment
- `GET /payments/verify/:reference` - Verify payment
- `GET /payments/history` - Get payment history

## 🧪 Test Scenarios

### 1. User Registration & Authentication
```bash
# Test new user registration
POST /auth/register
{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "New",
  "lastName": "User",
  "phoneNumber": "+2348055555555",
  "dateOfBirth": "1995-06-15"
}

# Test login
POST /auth/login
{
  "email": "newuser@example.com",
  "password": "password123"
}
```

### 2. Wallet Operations
```bash
# Check wallet balance
GET /wallet

# Fund wallet
POST /wallet/fund
{
  "amount": 50000,
  "currency": "NGN",
  "paymentMethod": "paystack"
}

# View transactions
GET /wallet/transactions?page=1&limit=10
```

### 3. Claims Management
```bash
# Submit medical claim
POST /claims
{
  "type": "medical",
  "title": "Hospital Bill Claim",
  "description": "Emergency treatment at General Hospital",
  "amount": 75000,
  "currency": "NGN"
}

# Check claim status
GET /claims

# Admin: Review claim
PUT /claims/:claimId/status
{
  "status": "approved",
  "reviewNotes": "Valid claim with proper documentation",
  "approvedAmount": 70000
}
```

### 4. Group Savings
```bash
# Create savings group
POST /groups
{
  "name": "Monthly Savers",
  "description": "Monthly savings for emergencies",
  "contributionAmount": 25000,
  "maxMembers": 8,
  "contributionFrequency": "monthly",
  "totalCycles": 8
}

# Join existing group
POST /groups/:groupId/join

# Make contribution
POST /groups/:groupId/contribute
{
  "amount": 25000
}
```

## 📋 Testing Checklist

### ✅ Authentication Flow
- [ ] User registration with validation
- [ ] User login with correct credentials
- [ ] Failed login with wrong credentials
- [ ] Token refresh mechanism
- [ ] Protected route access
- [ ] Admin-only route access

### ✅ User Management
- [ ] Get user profile
- [ ] Update user information
- [ ] Change password
- [ ] Admin user management

### ✅ Wallet System
- [ ] View wallet balance
- [ ] Fund wallet successfully
- [ ] Transaction history retrieval
- [ ] Transaction details

### ✅ Claims System
- [ ] Submit new claim
- [ ] View user claims with pagination
- [ ] Admin review and approval
- [ ] Claim status updates

### ✅ Group Savings
- [ ] Create new group
- [ ] Join existing group
- [ ] Make contributions
- [ ] View group progress

### ✅ Error Handling
- [ ] Invalid authentication tokens
- [ ] Validation errors
- [ ] Not found errors
- [ ] Permission errors

## 🔍 Key Test Cases

### High Priority Tests:
1. **Authentication Security** - Token validation, refresh mechanism
2. **Wallet Accuracy** - Balance calculations, transaction integrity
3. **Claims Processing** - Proper status flow, admin controls
4. **Group Mechanics** - Contribution tracking, payout logic

### Edge Cases:
1. **Concurrent Transactions** - Multiple wallet operations
2. **Group Capacity** - Joining full groups
3. **Invalid Claims** - Duplicate submissions
4. **Token Expiry** - Handling expired authentication

## 🛠️ Tools for Testing

### Recommended:
- **VS Code REST Client** - Use `api-tests.http`
- **Postman** - Import endpoints for team collaboration
- **Automated Script** - Run `npm run test:api`

### Manual Testing:
- Use demo credentials provided in seeder output
- Test with different user roles (user vs admin)
- Verify response formats and status codes
- Check error handling and validation

## 📊 Expected Response Times
- Authentication: < 200ms
- Wallet operations: < 150ms
- Claims submission: < 300ms
- Group operations: < 250ms

Happy Testing! 🚀