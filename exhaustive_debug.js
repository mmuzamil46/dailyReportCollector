const reports0 = db.reports.find({ payment: 0 }, { serviceId: 1, serviceCategory: 1, priceVariant: 1 }).toArray();
const summary = {};

reports0.forEach(r => {
  const key = `${r.serviceId}_${r.serviceCategory || 'NONE'}_${r.priceVariant || 'NONE'}`;
  if (!summary[key]) {
    summary[key] = {
      serviceId: r.serviceId,
      serviceCategory: r.serviceCategory,
      priceVariant: r.priceVariant,
      count: 0
    };
  }
  summary[key].count++;
});

const results = Object.values(summary).map(s => {
  const service = db.services.findOne({ _id: s.serviceId }, { name: 1, price: 1, categories: 1 });
  s.serviceName = service ? service.name : 'UNKNOWN';
  s.servicePrice = service ? service.price : null;
  s.hasCategories = service ? (service.categories && service.categories.length > 0) : false;
  return s;
});

printjson(results);
