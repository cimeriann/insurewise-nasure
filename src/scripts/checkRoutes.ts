import axios from 'axios';
import colors from 'colors';

const BASE_URL = 'http://localhost:3000';

async function checkAvailableRoutes() {
  console.log(colors.blue('🔍 Checking Available Routes\n'));
  
  const testRoutes = [
    'GET /health',
    'POST /api/v1/auth/register',
    'POST /api/v1/auth/login',
    'GET /api/v1/auth/me',
    'POST /api/v1/auth/refresh',
    'POST /api/v1/auth/forgot-password'
  ];

  for (const route of testRoutes) {
    const [method, path] = route.split(' ');
    try {
      const response = await axios({
        method: method.toLowerCase(),
        url: `${BASE_URL}${path}`,
        timeout: 3000,
        validateStatus: () => true // Don't throw on any status
      });
      
      const statusColor = response.status < 400 ? colors.green : 
                         response.status < 500 ? colors.yellow : colors.red;
      console.log(statusColor(`${route} - ${response.status}`));
      
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.log(colors.red(`${route} - Server not running`));
      } else {
        console.log(colors.red(`${route} - ${error.message}`));
      }
    }
  }
}

checkAvailableRoutes();