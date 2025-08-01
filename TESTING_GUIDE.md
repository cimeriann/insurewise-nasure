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
npx ts-node src/scripts/testEndpoints.ts
```

### 3. Manual Testing with HTTP Client
Use the examples below with any HTTP client (Postman, Insomnia, VS Code REST Client).

## 📊 Demo Data Overview

### Users Created:
- **Regular User**: `john.doe@example.com` / `password123`
- **Admin User**: `admin@insurewise.com` / `password123`
- **Additional Users**: jane.smith@example.com, mike.johnson@example.com, sarah.wilson@example.com

### Data Generated:
- ✅ 5 Users with different roles and verification status
- ✅ 5 Wallets with random balances (₦10,000 - ₦60,000)
- ✅ 15+ Transactions (funding and spending)
- ✅ 10+ Medical Claims with various statuses
- ✅ 3 Group Savings (active monthly, draft monthly, active weekly)
- ✅ 3+ Health Insurance Plans
- ✅ Sample Insurance Subscriptions and Claims

## 🔗 API Endpoints to Test

### Authentication (`/api/v1/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /me` - Get current user profile
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout user
- `PUT /change-password` - Change user password
- `POST /forgot-password` - Request password reset

### Users (`/api/v1/users`)
- `GET /users` - Get all users (admin only)
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `PUT /users/change-password` - Change password

### Wallet (`/api/v1/wallet`)
- `GET /wallet` - Get user wallet
- `GET /wallet/balance` - Get wallet balance
- `POST /wallet/fund` - Fund wallet
- `POST /wallet/withdraw` - Withdraw from wallet
- `GET /wallet/transactions` - Get transaction history
- `GET /wallet/transactions/:id` - Get specific transaction

### Claims (`/api/v1/claims`)
- `POST /claims` - Submit new claim
- `GET /claims` - Get user claims
- `GET /claims/:id` - Get specific claim
- `PUT /claims/:id` - Update claim
- `DELETE /claims/:id` - Delete claim
- `GET /claims/admin/all` - Get all claims (admin)
- `GET /claims/admin/pending` - Get pending claims (admin)
- `GET /claims/admin/stats` - Get claim statistics (admin)
- `PUT /claims/admin/:id/review` - Review claim (admin)
- `PUT /claims/admin/:id/approve` - Approve claim (admin)
- `PUT /claims/admin/:id/decline` - Decline claim (admin)

### Group Savings (`/api/v1/group-savings`)
- `POST /group-savings` - Create new group
- `GET /group-savings` - Get all groups
- `GET /group-savings/my-groups` - Get user's groups
- `GET /group-savings/:id` - Get specific group
- `PUT /group-savings/:id` - Update group
- `DELETE /group-savings/:id` - Delete group
- `POST /group-savings/:id/join` - Join group
- `POST /group-savings/:id/leave` - Leave group
- `POST /group-savings/:id/contribute` - Make contribution
- `GET /group-savings/:id/contributions` - Get group contributions
- `GET /group-savings/:id/members` - Get group members
- `PUT /group-savings/:id/start` - Start group (creator only)

### Payments (`/api/v1/payments`)
- `POST /payments/initialize` - Initialize payment
- `POST /payments/verify` - Verify payment
- `GET /payments/history` - Get payment history
- `GET /payments/admin/stats` - Get payment statistics (admin)
- `POST /payments/group-contribution` - Initialize group contribution payment

### Insurance Plans (`/api/v1/insurance-plans`)
- `GET /insurance-plans` - Get all available plans
- `GET /insurance-plans/:id` - Get specific plan
- `POST /insurance-plans` - Create new plan (admin)
- `PUT /insurance-plans/:id` - Update plan (admin)
- `DELETE /insurance-plans/:id` - Delete plan (admin)

### Insurance Subscriptions (`/api/v1/insurance-subscriptions`)
- `POST /insurance-subscriptions` - Subscribe to plan
- `GET /insurance-subscriptions` - Get user subscriptions
- `GET /insurance-subscriptions/:id` - Get specific subscription
- `PUT /insurance-subscriptions/:id` - Update subscription
- `POST /insurance-subscriptions/:id/cancel` - Cancel subscription

## 🧪 Test Scenarios with Mock Data

### 1. Authentication & User Registration

#### Register New User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "testuser@example.com",
  "password": "password123",
  "firstName": "Test",
  "lastName": "User",
  "phoneNumber": "+2348055555555",
  "dateOfBirth": "1995-06-15",
  "address": "123 Test Street, Lagos, Nigeria"
}
```

#### User Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

#### Admin Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@insurewise.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer {{accessToken}}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{{refreshToken}}"
}
```

#### Change Password
```http
PUT /api/v1/auth/change-password
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "currentPassword": "password123",
  "newPassword": "newpassword123"
}
```

### 2. User Management

#### Get All Users (Admin Only)
```http
GET /api/v1/users
Authorization: Bearer {{adminToken}}
```

#### Get User Profile
```http
GET /api/v1/users/profile
Authorization: Bearer {{accessToken}}
```

#### Update User Profile
```http
PUT /api/v1/users/profile
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "firstName": "Updated",
  "lastName": "Name",
  "phoneNumber": "+2348066666666",
  "address": "456 Updated Street, Abuja, Nigeria"
}
```

### 3. Wallet Operations

#### Get Wallet
```http
GET /api/v1/wallet
Authorization: Bearer {{accessToken}}
```

#### Get Wallet Balance
```http
GET /api/v1/wallet/balance
Authorization: Bearer {{accessToken}}
```

#### Fund Wallet
```http
POST /api/v1/wallet/fund
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "amount": 50000,
  "currency": "NGN",
  "paymentMethod": "paystack"
}
```

#### Withdraw from Wallet
```http
POST /api/v1/wallet/withdraw
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "amount": 10000,
  "currency": "NGN",
  "bankAccount": {
    "accountNumber": "1234567890",
    "bankCode": "044",
    "accountName": "Test User"
  }
}
```

#### Get Transaction History
```http
GET /api/v1/wallet/transactions?page=1&limit=10
Authorization: Bearer {{accessToken}}
```

### 4. Claims Management

#### Submit New Claim
```http
POST /api/v1/claims
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "type": "medical",
  "title": "Emergency Hospital Treatment",
  "description": "Emergency treatment at Lagos University Teaching Hospital for acute appendicitis",
  "amount": 125000,
  "currency": "NGN",
  "receiptUrl": "https://example.com/receipts/receipt_001.pdf",
  "documents": [
    "https://example.com/docs/medical_report.pdf",
    "https://example.com/docs/discharge_summary.pdf"
  ]
}
```

#### Get User Claims
```http
GET /api/v1/claims?status=pending&page=1&limit=10
Authorization: Bearer {{accessToken}}
```

#### Get Specific Claim
```http
GET /api/v1/claims/{{claimId}}
Authorization: Bearer {{accessToken}}
```

#### Get All Claims (Admin)
```http
GET /api/v1/claims/admin/all?page=1&limit=20
Authorization: Bearer {{adminToken}}
```

#### Get Pending Claims (Admin)
```http
GET /api/v1/claims/admin/pending
Authorization: Bearer {{adminToken}}
```

#### Get Claim Statistics (Admin)
```http
GET /api/v1/claims/admin/stats
Authorization: Bearer {{adminToken}}
```

#### Review Claim (Admin)
```http
PUT /api/v1/claims/admin/{{claimId}}/review
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "status": "under_review",
  "notes": "Claim is being reviewed for medical necessity and documentation completeness"
}
```

#### Approve Claim (Admin)
```http
PUT /api/v1/claims/admin/{{claimId}}/approve
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "approvedAmount": 120000,
  "notes": "Claim approved. Amount reduced due to policy limit on emergency procedures."
}
```

#### Decline Claim (Admin)
```http
PUT /api/v1/claims/admin/{{claimId}}/decline
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "notes": "Claim declined due to incomplete documentation. Please resubmit with required medical reports."
}
```

### 5. Group Savings

#### Create New Group
```http
POST /api/v1/group-savings
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "name": "Tech Workers Monthly Savings",
  "description": "Monthly savings group for tech professionals in Lagos",
  "contributionAmount": 30000,
  "currency": "NGN",
  "maxMembers": 10,
  "frequency": "monthly",
  "totalCycles": 10
}
```

#### Get All Groups
```http
GET /api/v1/group-savings?status=active&page=1&limit=10
Authorization: Bearer {{accessToken}}
```

#### Get User's Groups
```http
GET /api/v1/group-savings/my-groups
Authorization: Bearer {{accessToken}}
```

#### Get Specific Group
```http
GET /api/v1/group-savings/{{groupId}}
Authorization: Bearer {{accessToken}}
```

#### Join Group
```http
POST /api/v1/group-savings/{{groupId}}/join
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{}
```

#### Make Contribution
```http
POST /api/v1/group-savings/{{groupId}}/contribute
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "amount": 30000,
  "cycle": 1
}
```

#### Get Group Members
```http
GET /api/v1/group-savings/{{groupId}}/members
Authorization: Bearer {{accessToken}}
```

#### Get Group Contributions
```http
GET /api/v1/group-savings/{{groupId}}/contributions
Authorization: Bearer {{accessToken}}
```

#### Start Group (Creator Only)
```http
PUT /api/v1/group-savings/{{groupId}}/start
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{}
```

### 6. Payment Operations

#### Initialize Payment
```http
POST /api/v1/payments/initialize
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "amount": 25000,
  "currency": "NGN",
  "purpose": "wallet_funding",
  "paymentMethod": "paystack"
}
```

#### Verify Payment
```http
POST /api/v1/payments/verify
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "reference": "{{paymentReference}}"
}
```

#### Get Payment History
```http
GET /api/v1/payments/history?status=successful&page=1&limit=10
Authorization: Bearer {{accessToken}}
```

#### Get Payment Statistics (Admin)
```http
GET /api/v1/payments/admin/stats
Authorization: Bearer {{adminToken}}
```

#### Initialize Group Contribution Payment
```http
POST /api/v1/payments/group-contribution
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "groupId": "{{groupId}}",
  "amount": 30000,
  "currency": "NGN"
}
```

### 7. Insurance Plans

#### Get All Insurance Plans
```http
GET /api/v1/insurance-plans
```

#### Get Specific Insurance Plan
```http
GET /api/v1/insurance-plans/{{planId}}
```

#### Create Insurance Plan (Admin)
```http
POST /api/v1/insurance-plans
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "name": "Premium Health Plan",
  "tier": "premium",
  "coverage": {
    "hospitalization": true,
    "outpatient": true,
    "dental": true,
    "optical": true,
    "maternity": true,
    "preExistingConditions": true
  },
  "premium": {
    "monthly": 25000,
    "quarterly": 70000,
    "yearly": 250000
  },
  "maxCoverageAmount": 10000000,
  "waitingPeriod": 30,
  "description": "Comprehensive health insurance with full coverage including pre-existing conditions"
}
```

### 8. Insurance Subscriptions

#### Subscribe to Insurance Plan
```http
POST /api/v1/insurance-subscriptions
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "planId": "{{planId}}",
  "paymentFrequency": "monthly",
  "beneficiaries": [
    {
      "name": "Jane Doe",
      "relationship": "spouse",
      "dateOfBirth": "1992-03-15",
      "phoneNumber": "+2348077777777"
    },
    {
      "name": "John Doe Jr",
      "relationship": "child",
      "dateOfBirth": "2015-08-20"
    }
  ],
  "emergencyContact": {
    "name": "Dr. Smith Johnson",
    "phoneNumber": "+2348088888888",
    "relationship": "family_doctor"
  },
  "medicalHistory": {
    "conditions": ["hypertension"],
    "medications": ["lisinopril"],
    "allergies": ["penicillin"]
  }
}
```

#### Get User Subscriptions
```http
GET /api/v1/insurance-subscriptions
Authorization: Bearer {{accessToken}}
```

#### Get Specific Subscription
```http
GET /api/v1/insurance-subscriptions/{{subscriptionId}}
Authorization: Bearer {{accessToken}}
```

#### Cancel Subscription
```http
POST /api/v1/insurance-subscriptions/{{subscriptionId}}/cancel
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "reason": "Moving to different insurance provider"
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
- [ ] Password change functionality
- [ ] Logout functionality

### ✅ User Management
- [ ] Get user profile
- [ ] Update user information
- [ ] Change password
- [ ] Admin user management
- [ ] User role verification

### ✅ Wallet System
- [ ] View wallet balance
- [ ] Fund wallet successfully
- [ ] Withdraw from wallet
- [ ] Transaction history retrieval
- [ ] Transaction details
- [ ] Balance accuracy after operations

### ✅ Claims System
- [ ] Submit new claim with all required fields
- [ ] View user claims with pagination
- [ ] Get specific claim details
- [ ] Admin review and approval workflow
- [ ] Claim status updates
- [ ] Claim statistics (admin)

### ✅ Group Savings
- [ ] Create new group with proper parameters
- [ ] Join existing group
- [ ] Make contributions
- [ ] View group progress
- [ ] Member management
- [ ] Group lifecycle (draft → active)

### ✅ Payment System
- [ ] Initialize payment
- [ ] Verify payment
- [ ] Payment history
- [ ] Payment statistics (admin)
- [ ] Group contribution payments

### ✅ Insurance System
- [ ] View available insurance plans
- [ ] Create insurance plan (admin)
- [ ] Subscribe to insurance plan
- [ ] View subscriptions
- [ ] Cancel subscription
- [ ] Update subscription details

### ✅ Error Handling
- [ ] Invalid authentication tokens
- [ ] Validation errors for all endpoints
- [ ] Not found errors (404)
- [ ] Permission errors (403)
- [ ] Server errors (500)
- [ ] Rate limiting responses

## 🔍 Key Test Cases

### High Priority Tests:
1. **Authentication Security** - Token validation, refresh mechanism, role-based access
2. **Wallet Accuracy** - Balance calculations, transaction integrity
3. **Claims Processing** - Proper status flow, admin controls, approval workflow
4. **Group Mechanics** - Contribution tracking, payout logic, member management
5. **Insurance Workflow** - Plan subscription, claim submission against subscriptions

### Edge Cases:
1. **Concurrent Transactions** - Multiple wallet operations simultaneously
2. **Group Capacity** - Joining full groups, maximum member limits
3. **Invalid Claims** - Duplicate submissions, insufficient funds
4. **Token Expiry** - Handling expired authentication tokens
5. **Insurance Limits** - Claims exceeding coverage limits

## 🛠️ Tools for Testing

### Recommended:
- **VS Code REST Client** - Use `.http` files for organized testing
- **Postman** - Import collection for team collaboration
- **Automated Script** - Run `npx ts-node src/scripts/testEndpoints.ts`
- **API Documentation** - Generate with Swagger/OpenAPI

### Manual Testing:
- Use demo credentials provided in seeder output
- Test with different user roles (user vs admin)
- Verify response formats and status codes
- Check error handling and validation
- Test pagination on list endpoints

## 📊 Expected Response Times
- Authentication: < 200ms
- Wallet operations: < 150ms
- Claims submission: < 300ms
- Group operations: < 250ms
- Insurance operations: < 200ms

## 🎯 Test Data Sets

### Valid User Registration Data:
```json
{
  "email": "testuser1@example.com",
  "password": "TestPass123!",
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+2348012345678",
  "dateOfBirth": "1990-05-15",
  "address": "123 Main Street, Lagos, Nigeria"
}
```

### Valid Claim Data:
```json
{
  "type": "medical",
  "title": "Dental Surgery",
  "description": "Root canal treatment at Smile Dental Clinic",
  "amount": 85000,
  "currency": "NGN",
  "receiptUrl": "https://example.com/receipt.pdf",
  "documents": ["https://example.com/xray.pdf"]
}
```

### Valid Group Savings Data:
```json
{
  "name": "Young Professionals Circle",
  "description": "Monthly savings for career development",
  "contributionAmount": 50000,
  "currency": "NGN",
  "maxMembers": 12,
  "frequency": "monthly",
  "totalCycles": 12
}
```

### Valid Insurance Plan Data:
```json
{
  "name": "Basic Health Coverage",
  "tier": "basic",
  "coverage": {
    "hospitalization": true,
    "outpatient": true,
    "dental": false,
    "optical": false,
    "maternity": false,
    "preExistingConditions": false
  },
  "premium": {
    "monthly": 15000,
    "quarterly": 42000,
    "yearly": 150000
  },
  "maxCoverageAmount": 5000000,
  "waitingPeriod": 30,
  "description": "Basic health insurance covering essential medical needs"
}
```

## 🚨 Common Issues & Solutions

### Authentication Issues:
- **Token expired**: Use refresh token endpoint
- **Invalid credentials**: Check email/password format
- **Access denied**: Verify user role permissions

### Wallet Issues:
- **Insufficient funds**: Check wallet balance before operations
- **Transaction failed**: Verify payment method and amount
- **Balance mismatch**: Check transaction history for discrepancies

### Group Issues:
- **Cannot join group**: Check if group is full or user already member
- **Contribution failed**: Verify contribution amount matches group settings
- **Permission denied**: Only creators can start/modify groups

### Claims Issues:
- **Validation errors**: Ensure all required fields are provided
- **Duplicate claim**: Check for existing claims with same details
- **Admin access**: Only admins can review/approve claims

Happy Testing! 🚀