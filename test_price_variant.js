const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

async function testPriceVariant() {
  try {
    // Get today's reports
    const reports = await makeRequest('/api/reports/public/reports?date=today');
    
    console.log('Total reports today:', reports.length);
    
    // Check reports with price variants
    const reportsWithVariants = reports.filter(r => r.priceVariant);
    console.log('Reports with price variants:', reportsWithVariants.length);
    
    // Check reports with actual price/payment values
    const reportsWithPrice = reports.filter(r => r.price > 0 || r.payment > 0);
    console.log('Reports with price/payment > 0:', reportsWithPrice.length);
    
    // Show some examples
    console.log('\nSample reports with price variants:');
    reportsWithVariants.slice(0, 5).forEach((report, index) => {
      console.log(`${index + 1}. Service: ${report.serviceId?.name}, Variant: ${report.priceVariant}, Price: ${report.price}, Payment: ${report.payment}`);
    });
    
    // Get services to check price variant configuration
    const services = await makeRequest('/api/services');
    
    console.log('\nServices with price variants:');
    services.forEach(service => {
      const categoriesWithVariants = service.categories?.filter(c => c.hasPriceVariants) || [];
      if (categoriesWithVariants.length > 0) {
        console.log(`Service: ${service.name}`);
        categoriesWithVariants.forEach(category => {
          console.log(`  Category: ${category.name}`);
          console.log(`  Variants:`, category.priceVariants);
        });
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPriceVariant();
