import axios, { AxiosResponse } from 'axios';
import colors from 'colors';

const BASE_URL = 'http://localhost:3000/api/v1';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  responseTime: number;
  error?: string;
}

class APITester {
  private userToken: string = '';
  private adminToken: string = '';
  private results: TestResult[] = [];
  private createdClaimId: string = '';
  private createdGroupId: string = '';

  async runAllTests() {
    console.log(colors.blue('🚀 Starting API Endpoint Tests\n'));

    try {
      // Test connectivity first
      const isConnected = await this.testConnectivity();
      if (!isConnected) {
        console.log(colors.red('\n❌ Aborting tests - server not reachable'));
        return;
      }

      // Test authentication first
      await this.testAuthentication();
      
      // Test other endpoints if auth succeeds
      if (this.userToken && this.adminToken) {
        await this.testUserEndpoints();
        await this.testWalletEndpoints();
        await this.testClaimsEndpoints();
        await this.testGroupSavingsEndpoints();
        await this.testPaymentEndpoints();
      } else {
        console.log(colors.yellow('⚠️  Skipping other tests - authentication failed'));
      }

      this.printSummary();
    } catch (error) {
      console.error(colors.red('❌ Test suite failed:'), error);
    }
  }

  private async testConnectivity() {
    console.log(colors.yellow('🔌 Testing Server Connectivity'));
    
    try {
      const response = await axios.get(`${BASE_URL.replace('/api/v1', '')}/health`, {
        timeout: 5000
      });
      console.log(colors.green('✅ Server is reachable'));
      return true;
    } catch (error) {
      console.log(colors.red('❌ Cannot connect to server'));
      console.log(colors.red(`   Make sure your server is running on ${BASE_URL.replace('/api/v1', '')}`));
      return false;
    }
  }

  private async testAuthentication() {
    console.log(colors.yellow('🔐 Testing Authentication Endpoints'));

    // Test user registration first
    await this.makeRequest('POST', '/auth/register', {
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: `+234801${Math.floor(Math.random() * 10000000)}`,
      dateOfBirth: '1995-06-15',
      address: '123 Test Street, Lagos'
    });

    // Test user login (use seeded user)
    const userLogin = await this.makeRequest('POST', '/auth/login', {
      email: 'john.doe@example.com',
      password: 'password123'
    });

    if (userLogin.success && userLogin.data?.data?.accessToken) {
      this.userToken = userLogin.data.data.accessToken;
      console.log(colors.green('✅ User login successful'));
    }

    // Test admin login (use seeded admin)
    const adminLogin = await this.makeRequest('POST', '/auth/login', {
      email: 'admin@insurewise.com',
      password: 'password123'
    });

    if (adminLogin.success && adminLogin.data?.data?.accessToken) {
      this.adminToken = adminLogin.data.data.accessToken;
      console.log(colors.green('✅ Admin login successful'));
    }

    // Test get current user
    await this.makeRequest('GET', '/auth/me', null, this.userToken);

    // Test refresh token
    await this.makeRequest('POST', '/auth/refresh', {
      refreshToken: userLogin.data?.data?.refreshToken
    });

    // Test password reset request
    await this.makeRequest('POST', '/auth/forgot-password', {
      email: 'john.doe@example.com'
    });

    console.log();
  }

  private async testUserEndpoints() {
    console.log(colors.yellow('👥 Testing User Endpoints'));

    // Get all users (admin only)
    await this.makeRequest('GET', '/users', null, this.adminToken);

    // Get user profile
    await this.makeRequest('GET', '/users/profile', null, this.userToken);

    // Update user profile
    await this.makeRequest('PUT', '/users/profile', {
      firstName: 'Updated',
      lastName: 'Name',
      address: '456 Updated Street, Lagos'
    }, this.userToken);

    // Change password
    await this.makeRequest('PUT', '/users/change-password', {
      currentPassword: 'password123',
      newPassword: 'newpassword123'
    }, this.userToken);

    // Change password back
    await this.makeRequest('PUT', '/users/change-password', {
      currentPassword: 'newpassword123',
      newPassword: 'password123'
    }, this.userToken);

    console.log();
  }

  private async testWalletEndpoints() {
    console.log(colors.yellow('💰 Testing Wallet Endpoints'));

    // Get wallet
    await this.makeRequest('GET', '/wallet', null, this.userToken);

    // Get wallet balance
    await this.makeRequest('GET', '/wallet/balance', null, this.userToken);

    // Fund wallet
    await this.makeRequest('POST', '/wallet/fund', {
      amount: 25000,
      currency: 'NGN',
      paymentMethod: 'paystack'
    }, this.userToken);

    // Get transactions
    await this.makeRequest('GET', '/wallet/transactions', null, this.userToken);

    // Get transactions with pagination
    await this.makeRequest('GET', '/wallet/transactions?page=1&limit=5', null, this.userToken);

    // Withdraw from wallet (if available)
    await this.makeRequest('POST', '/wallet/withdraw', {
      amount: 5000,
      currency: 'NGN',
      bankAccount: {
        accountNumber: '1234567890',
        bankCode: '044',
        accountName: 'Test User'
      }
    }, this.userToken);

    console.log();
  }

  private async testClaimsEndpoints() {
    console.log(colors.yellow('📋 Testing Claims Endpoints'));

    // Submit claim
    const claimResponse = await this.makeRequest('POST', '/claims', {
      type: 'medical',
      title: 'Test Medical Claim',
      description: 'Test claim for API testing - hospital bill payment',
      amount: 50000,
      currency: 'NGN',
      receiptUrl: 'https://example.com/test-receipt.pdf',
      documents: ['https://example.com/test-doc1.pdf']
    }, this.userToken);

    if (claimResponse.success && claimResponse.data?.data?._id) {
      this.createdClaimId = claimResponse.data.data._id;
    }

    // Get user claims
    await this.makeRequest('GET', '/claims', null, this.userToken);

    // Get user claims with filters
    await this.makeRequest('GET', '/claims?status=pending&page=1&limit=10', null, this.userToken);

    // Get specific claim
    if (this.createdClaimId) {
      await this.makeRequest('GET', `/claims/${this.createdClaimId}`, null, this.userToken);
    }

    // Admin endpoints
    // Get all claims (admin)
    await this.makeRequest('GET', '/claims/admin/all', null, this.adminToken);

    // Get pending claims (admin)
    await this.makeRequest('GET', '/claims/admin/pending', null, this.adminToken);

    // Get claim statistics (admin)
    await this.makeRequest('GET', '/claims/admin/stats', null, this.adminToken);

    // Review claim (admin)
    if (this.createdClaimId) {
      await this.makeRequest('PUT', `/claims/admin/${this.createdClaimId}/review`, {
        status: 'under_review',
        notes: 'Claim is being reviewed for verification'
      }, this.adminToken);

      // Approve claim (admin)
      await this.makeRequest('PUT', `/claims/admin/${this.createdClaimId}/approve`, {
        approvedAmount: 45000,
        notes: 'Claim approved with 10% deduction for processing'
      }, this.adminToken);
    }

    console.log();
  }

  private async testGroupSavingsEndpoints() {
    console.log(colors.yellow('👥 Testing Group Savings Endpoints'));

    // Create group
    const groupResponse = await this.makeRequest('POST', '/group-savings', {
      name: 'Test API Group',
      description: 'Group created for API testing purposes',
      contributionAmount: 20000,
      currency: 'NGN',
      maxMembers: 5,
      frequency: 'monthly', // Fixed: using 'frequency' instead of 'contributionFrequency'
      totalCycles: 5
    }, this.userToken);

    if (groupResponse.success && groupResponse.data?.data?._id) {
      this.createdGroupId = groupResponse.data.data._id;
    }

    // Get all groups
    await this.makeRequest('GET', '/group-savings', null, this.userToken);

    // Get groups with filters
    await this.makeRequest('GET', '/group-savings?status=draft&page=1&limit=10', null, this.userToken);

    // Get user's groups
    await this.makeRequest('GET', '/group-savings/my-groups', null, this.userToken);

    // Get specific group
    if (this.createdGroupId) {
      await this.makeRequest('GET', `/group-savings/${this.createdGroupId}`, null, this.userToken);

      // Join group (with different user would be better, but test with same for now)
      await this.makeRequest('POST', `/group-savings/${this.createdGroupId}/join`, {}, this.userToken);

      // Get group members
      await this.makeRequest('GET', `/group-savings/${this.createdGroupId}/members`, null, this.userToken);

      // Make contribution
      await this.makeRequest('POST', `/group-savings/${this.createdGroupId}/contribute`, {
        amount: 20000,
        cycle: 1
      }, this.userToken);

      // Get group contributions
      await this.makeRequest('GET', `/group-savings/${this.createdGroupId}/contributions`, null, this.userToken);

      // Start group (creator only)
      await this.makeRequest('PUT', `/group-savings/${this.createdGroupId}/start`, {}, this.userToken);
    }

    console.log();
  }

  private async testPaymentEndpoints() {
    console.log(colors.yellow('💳 Testing Payment Endpoints'));

    // Initialize payment
    const paymentResponse = await this.makeRequest('POST', '/payments/initialize', {
      amount: 30000,
      currency: 'NGN',
      purpose: 'wallet_funding',
      paymentMethod: 'paystack'
    }, this.userToken);

    // Verify payment (would normally be called by webhook)
    if (paymentResponse.success && paymentResponse.data?.data?.reference) {
      await this.makeRequest('POST', '/payments/verify', {
        reference: paymentResponse.data.data.reference
      }, this.userToken);
    }

    // Get payment history
    await this.makeRequest('GET', '/payments/history', null, this.userToken);

    // Get payment history with filters
    await this.makeRequest('GET', '/payments/history?status=successful&page=1&limit=10', null, this.userToken);

    // Get payment statistics (admin)
    await this.makeRequest('GET', '/payments/admin/stats', null, this.adminToken);

    // Initialize group contribution payment
    if (this.createdGroupId) {
      await this.makeRequest('POST', '/payments/group-contribution', {
        groupId: this.createdGroupId,
        amount: 20000,
        currency: 'NGN'
      }, this.userToken);
    }

    console.log();
  }

  private async makeRequest(
    method: string, 
    endpoint: string, 
    data?: any, 
    token?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const startTime = Date.now();
    
    try {
      const config: any = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000, // 10 second timeout
        validateStatus: function (status: number) {
          return status < 500; // Don't throw for client errors (4xx)
        }
      };

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data;
      }

      console.log(colors.gray(`→ ${method} ${endpoint}`)); // Add request logging

      const response: AxiosResponse = await axios(config);
      const responseTime = Date.now() - startTime;

      const result: TestResult = {
        endpoint,
        method,
        status: response.status,
        success: response.status >= 200 && response.status < 400,
        responseTime
      };

      this.results.push(result);
      
      if (result.success) {
        console.log(colors.green(`✅ ${method} ${endpoint} - ${response.status} (${responseTime}ms)`));
      } else {
        console.log(colors.yellow(`⚠️  ${method} ${endpoint} - ${response.status} (${responseTime}ms) - ${response.data?.message || 'Client error'}`));
      }

      return { success: result.success, data: response.data };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const status = error.response?.status || 0;
      const errorMessage = error.response?.data?.message || error.message;

      const result: TestResult = {
        endpoint,
        method,
        status,
        success: false,
        responseTime,
        error: errorMessage
      };

      this.results.push(result);
      console.log(colors.red(`❌ ${method} ${endpoint} - ${status} (${responseTime}ms) - ${errorMessage}`));

      return { success: false, error: errorMessage };
    }
  }

  private printSummary() {
    console.log(colors.blue('\n📊 Test Summary'));
    console.log('='.repeat(50));

    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const averageResponseTime = this.results.reduce((acc, r) => acc + r.responseTime, 0) / totalTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(colors.green(`Successful: ${successfulTests}`));
    console.log(colors.red(`Failed: ${failedTests}`));
    console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
    console.log(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(2)}%`);

    if (failedTests > 0) {
      console.log(colors.red('\n❌ Failed Tests:'));
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(colors.red(`  ${r.method} ${r.endpoint} - ${r.status} - ${r.error}`));
        });
    }

    console.log('\n' + '='.repeat(50));
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new APITester();
  tester.runAllTests();
}

export default APITester;