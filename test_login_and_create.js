const http = require('http');

function makeRequest(path, method, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testLoginAndCreateReport() {
  try {
    console.log('Testing login and report creation...\n');
    
    // First, try to login
    const loginData = {
      username: 'admin',
      password: 'admin123'
    };
    
    console.log('Attempting login...');
    const loginResponse = await makeRequest('/api/users/login', 'POST', loginData);
    
    if (loginResponse.token) {
      console.log('✅ Login successful');
      const token = loginResponse.token;
      
      // Get services
      const services = await makeRequest('/api/services', 'GET', null, {
        'Authorization': `Bearer ${token}`
      });
      
      const birthService = services.find(s => s.name === 'ልደት');
      
      if (!birthService) {
        console.log('Birth service not found');
        return;
      }
      
      const categoryWithVariants = birthService.categories.find(c => c.hasPriceVariants);
      
      if (!categoryWithVariants) {
        console.log('No category with price variants found');
        return;
      }
      
      // Create a test report
      const testReport = {
        serviceId: birthService._id,
        woreda: '15',
        serviceCategory: categoryWithVariants.name,
        date: new Date().toISOString().split('T')[0],
        cardSerial: 'TEST-' + Date.now(),
        referenceNo: 'REF-' + Date.now(),
        priceVariant: categoryWithVariants.priceVariants[0].label,
        price: categoryWithVariants.priceVariants[0].price,
        payment: categoryWithVariants.priceVariants[0].price
      };
      
      console.log('\nCreating test report...');
      console.log('- Price Variant:', testReport.priceVariant);
      console.log('- Price:', testReport.price);
      console.log('- Payment:', testReport.payment);
      
      const createdReport = await makeRequest('/api/reports', 'POST', testReport, {
        'Authorization': `Bearer ${token}`
      });
      
      console.log('\nCreated report response:', createdReport);
      
      // Check the summary
      console.log('\nChecking updated summary...');
      const summary = await makeRequest('/api/reports/public/summary/today');
      console.log('Total revenue after test:', summary.totalRevenue);
      
      if (summary.totalRevenue > 0) {
        console.log('✅ SUCCESS: Price variant fix is working!');
      } else {
        console.log('❌ ISSUE: Revenue is still 0.');
      }
      
    } else {
      console.log('❌ Login failed:', loginResponse);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLoginAndCreateReport();
