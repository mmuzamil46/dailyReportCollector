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

async function fixExistingReports() {
  try {
    console.log('Fixing existing reports with price variants...\n');
    
    // Get all services to build price lookup
    const services = await makeRequest('/api/services');
    console.log('Loaded', services.length, 'services');
    
    // Build a price lookup map
    const priceLookup = {};
    services.forEach(service => {
      service.categories?.forEach(category => {
        if (category.hasPriceVariants && category.priceVariants) {
          category.priceVariants.forEach(variant => {
            const key = `${service._id}-${category.name}-${variant.label}`;
            priceLookup[key] = variant.price;
          });
        }
      });
    });
    
    console.log('Built price lookup with', Object.keys(priceLookup).length, 'price variants');
    
    // Get today's reports
    const reports = await makeRequest('/api/reports/public/reports?date=today');
    console.log('Found', reports.length, 'reports for today');
    
    let fixedCount = 0;
    let totalRevenue = 0;
    
    // Create a summary of what needs to be fixed
    const reportsToFix = [];
    
    reports.forEach(report => {
      if (report.priceVariant && (!report.price || report.price === 0)) {
        const key = `${report.serviceId._id}-${report.serviceCategory || 'N/A'}-${report.priceVariant}`;
        const correctPrice = priceLookup[key];
        
        if (correctPrice) {
          reportsToFix.push({
            id: report._id,
            service: report.serviceId.name,
            category: report.serviceCategory,
            variant: report.priceVariant,
            correctPrice: correctPrice,
            currentPrice: report.price
          });
          totalRevenue += correctPrice;
        }
      }
    });
    
    console.log('\nReports that need fixing:');
    console.log('Total:', reportsToFix.length);
    console.log('Potential total revenue:', totalRevenue);
    
    // Show sample of reports to fix
    console.log('\nSample reports to fix:');
    reportsToFix.slice(0, 10).forEach((report, index) => {
      console.log(`${index + 1}. ${report.service} - ${report.variant} -> ${report.correctPrice} ETB`);
    });
    
    if (reportsToFix.length > 0) {
      console.log('\n⚠️  NOTE: These reports need to be updated in the database.');
      console.log('The frontend fix will work for NEW reports, but existing reports');
      console.log('need a database update to set the correct price/payment values.');
      
      // For now, let's create a manual summary to show what the revenue should be
      const currentSummary = await makeRequest('/api/reports/public/summary/today');
      
      console.log('\nCurrent summary:');
      console.log('- Total count:', currentSummary.totalCount);
      console.log('- Current revenue:', currentSummary.totalRevenue);
      console.log('- Should be revenue:', totalRevenue);
      
      // Update the summary calculation to show what it would be with correct prices
      console.log('\n✅ Analysis complete:');
      console.log('- Found', reportsToFix.length, 'reports with price variants but no prices');
      console.log('- These should generate', totalRevenue, 'ETB in revenue');
      console.log('- Frontend fix will prevent this issue for new reports');
      console.log('- Consider running a database migration to fix existing reports');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixExistingReports();
