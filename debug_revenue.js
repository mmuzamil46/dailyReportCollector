const ids = [
  ObjectId('69735855810f16fedc1bf95c'),
  ObjectId('6979c1f6e973c0e393603ef9')
];
const svcs = db.services.find({ _id: { $in: ids } }).toArray();
printjson(svcs);
