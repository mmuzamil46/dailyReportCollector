const http = require('http');

function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YzNjM2YyYTUyYTMyMmM3ZmUyOTY2ZiIsInJvbGUiOiJBZG1pbiIsIndvcmVkYSI6bnVsbCwiaWF0IjoxNzM4MjQ1MTY5LCJleHAiOjE3MzgzMzE1Njl9.K0fYvOwL8zNzHnOQg9M6kL1Xq8YhJm4P5qR9sT2X3W4'
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

async function testPriceVariantFix() {
  try {
    console.log('Testing price variant fix...\n');
    
    // Get services to find one with price variants
    const services = await makeRequest('/api/services');
    const birthService = services.find(s => s.name === 'ልደት');
    
    if (!birthService) {
      console.log('Birth service not found');
      return;
    }
    
    console.log('Found birth service:', birthService.name);
    
    // Find a category with price variants
    const categoryWithVariants = birthService.categories.find(c => c.hasPriceVariants);
    
    if (!categoryWithVariants) {
      console.log('No category with price variants found');
      return;
    }
    
    console.log('Found category with variants:', categoryWithVariants.name);
    console.log('Available variants:', categoryWithVariants.priceVariants);
    
    // Create a test report with price variant
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
    
    console.log('\nCreating test report with data:');
    console.log('- Service:', birthService.name);
    console.log('- Category:', categoryWithVariants.name);
    console.log('- Price Variant:', testReport.priceVariant);
    console.log('- Price:', testReport.price);
    console.log('- Payment:', testReport.payment);
    
    const createdReport = await makeRequest('/api/reports', 'POST', testReport);
    console.log('\nCreated report:', createdReport);
    
    // Check the summary after creating the report
    console.log('\nChecking updated summary...');
    const summary = await makeRequest('/api/reports/public/summary/today');
    console.log('Total revenue after test:', summary.totalRevenue);
    
    if (summary.totalRevenue > 0) {
      console.log('✅ SUCCESS: Price variant fix is working! Revenue is now being calculated correctly.');
    } else {
      console.log('❌ ISSUE: Revenue is still 0. There may be another issue.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPriceVariantFix();
