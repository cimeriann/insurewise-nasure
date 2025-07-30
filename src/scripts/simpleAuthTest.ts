import axios from 'axios';
import colors from 'colors';

const BASE_URL = 'http://localhost:3000';

async function testSimpleAuth() {
  console.log(colors.blue('🔍 Simple Auth Test\n'));
  
  try {
    console.log(colors.yellow('Testing POST /api/v1/auth/login with minimal data...'));
    
    const response = await axios({
      method: 'post',
      url: `${BASE_URL}/api/v1/auth/login`,
      data: {
        email: 'test@test.com',
        password: 'test123'
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000, // Longer` timeout for debugging
      validateStatus: () => true
    });
    
    console.log(colors.green(`Response Status: ${response.status}`));
    console.log(colors.green('Response Headers:'));
    console.log(response.headers);
    console.log(colors.green('Response Data:'));
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error: any) {
    console.log(colors.red('Error details:'));
    console.log(colors.red(`Code: ${error.code}`));
    console.log(colors.red(`Message: ${error.message}`));
    
    if (error.response) {
      console.log(colors.red(`Response Status: ${error.response.status}`));
      console.log(colors.red('Response Data:'));
      console.log(error.response.data);
    }
  }
}

testSimpleAuth();