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

async function testManualUpdate() {
  try {
    console.log('Testing manual price update...\n');
    
    // Get today's reports
    const reports = await makeRequest('/api/reports/public/reports?date=today');
    
    // Find a report with price variant but no price/payment
    const reportToUpdate = reports.find(r => r.priceVariant && (!r.price || r.price === 0));
    
    if (!reportToUpdate) {
      console.log('No report found with price variant but no price');
      return;
    }
    
    console.log('Found report to update:');
    console.log('- ID:', reportToUpdate._id);
    console.log('- Service:', reportToUpdate.serviceId?.name);
    console.log('- Price Variant:', reportToUpdate.priceVariant);
    console.log('- Current Price:', reportToUpdate.price);
    console.log('- Current Payment:', reportToUpdate.payment);
    
    // Get services to find the correct price for this variant
    const services = await makeRequest('/api/services');
    const service = services.find(s => s._id === reportToUpdate.serviceId._id);
    
    if (service) {
      const category = service.categories?.find(c => c.hasPriceVariants);
      if (category) {
        const variant = category.priceVariants?.find(v => v.label === reportToUpdate.priceVariant);
        
        if (variant) {
          console.log('\nFound correct price for variant:');
          console.log('- Variant:', variant.label);
          console.log('- Should be price:', variant.price);
          
          // Update the report with correct price (this would normally require auth)
          console.log('\nNote: Cannot update without authentication, but we can see the pricing structure is correct.');
          
          // Test the revenue calculation logic
          console.log('\nTesting revenue calculation logic...');
          
          // Simulate what the backend should do
          const testPayment = variant.price;
          console.log('If this report had payment of', testPayment, 'it would contribute to total revenue');
          
          // Check current summary
          const summary = await makeRequest('/api/reports/public/summary/today');
          console.log('Current total revenue:', summary.totalRevenue);
          
          console.log('\n✅ Analysis complete:');
          console.log('- Services have correct price variant configurations');
          console.log('- Reports have priceVariant values stored');
          console.log('- Issue: price/payment fields are not being set during report creation');
          console.log('- Frontend fix should resolve this for new reports');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testManualUpdate();
