const CardStock = require('../models/CardStock');
const CardTransfer = require('../models/CardTransfer');
const VoidCard = require('../models/VoidCard');
const Report = require('../models/Report'); // To check used cards
const User = require('../models/User');

// Add new stock (Subcity Store)
exports.addStock = async (req, res) => {
  try {
    const { serviceType, startSerial, endSerial } = req.body;
    
    // Basic validation
    if (parseInt(startSerial) > parseInt(endSerial)) {
      return res.status(400).json({ message: 'Start serial must be less than end serial' });
    }

    // Check for overlap (Simple check against other stocks of same service)
    const overlap = await CardStock.findOne({
      serviceType,
      $or: [
        { startSerial: { $lte: endSerial }, endSerial: { $gte: startSerial } }
      ]
    });

    if (overlap) {
      return res.status(400).json({ 
        message: `Serial range overlaps with existing stock (Range: ${overlap.startSerial}-${overlap.endSerial})` 
      });
    }

    const quantity = parseInt(endSerial) - parseInt(startSerial) + 1;

    const newStock = new CardStock({
      serviceType,
      startSerial,
      endSerial,
      quantity,
      addedBy: req.user.id // Assuming middleware populates req.user
    });

    await newStock.save();
    res.status(201).json(newStock);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Transfer stock to Woreda
exports.transferStock = async (req, res) => {
  try {
    const { serviceType, startSerial, endSerial, toWoreda } = req.body;

    if (parseInt(startSerial) > parseInt(endSerial)) {
      return res.status(400).json({ message: 'Start serial must be less than end serial' });
    }

    // Verify User has permission (Admin/Manager) - usually handled by route middleware, 
    // but we can check logic here too.
    
    // Check overlap with existing transfers for this Service Type
    // We don't want to double-assign the same cards to different Woredas
    const overlap = await CardTransfer.findOne({
      serviceType,
      $or: [
        { startSerial: { $lte: endSerial }, endSerial: { $gte: startSerial } }
      ]
    });

    if (overlap) {
      return res.status(400).json({ 
        message: `Serial range already transferred to ${overlap.toWoreda} (Range: ${overlap.startSerial}-${overlap.endSerial})` 
      });
    }

    // Optional: Check if we actually OWN this stock in CardStock? 
    // For now, let's assume Admin is cautious, but we could enforce it.
    // It would be complex to find exactly which stock document covers this range 
    // because it might span multiple initial inputs or be a subset.
    
    const quantity = parseInt(endSerial) - parseInt(startSerial) + 1;

    const transfer = new CardTransfer({
      serviceType,
      startSerial,
      endSerial,
      quantity,
      fromUser: req.user.id,
      toWoreda,
    });

    await transfer.save();
    res.status(201).json(transfer);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Report Void/Error Card
exports.reportVoid = async (req, res) => {
  try {
    const { serviceType, serialNumber, reason } = req.body;
    const woreda = req.user.woreda; // Assuming Woreda User

    if (!woreda) {
      return res.status(403).json({ message: 'User must belong to a Woreda to report void cards' });
    }

    // Check if duplicate void report
    const existing = await VoidCard.findOne({ serviceType, serialNumber });
    if (existing) {
      return res.status(400).json({ message: 'This card is already marked as void' });
    }

    const voidCard = new VoidCard({
      serviceType,
      serialNumber,
      woreda,
      reportedBy: req.user.id,
      reason
    });

    await voidCard.save();
    res.status(201).json(voidCard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Stats
exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate, woreda, serviceType } = req.query;

    const start = startDate ? new Date(startDate) : new Date(0); // Beginning of time if not specified
    const end = endDate ? new Date(endDate) : new Date();

    // Filters
    const transferFilter = { 
      transferDate: { $gte: start, $lte: end } 
    };
    const reportFilter = {
      date: { $gte: start, $lte: end },
      cardSerial: { $exists: true, $ne: null }
    };
    const voidFilter = {
      voidDate: { $gte: start, $lte: end }
    };

    if (woreda) {
      transferFilter.toWoreda = woreda;
      reportFilter.woreda = woreda;
      voidFilter.woreda = woreda;
    }
    
    if (serviceType) {
        // We need to match service names. 
        // Report model has `serviceCategory` or we might need to join with `Service` model if names differ.
        // Assuming `serviceType` matches `serviceCategory` string in Report or we filter Reports by service Name from Service ID
        // CardStock/Transfer use a String 'serviceType'.
        transferFilter.serviceType = serviceType;
        voidFilter.serviceType = serviceType;
    }

    // 1. Assigned (Transferred to Woreda)
    const transfers = await CardTransfer.find(transferFilter);
    const assignedCount = transfers.reduce((acc, curr) => acc + curr.quantity, 0);

    // 2. Used (From Daily Reports)
    // Complexity: Report has serviceId (ObjectId), not string Name.
    // If serviceType param is passed, we need to find the Service ObjectIds that match that name.
    if (serviceType) {
        // Find service IDs with this name
        // Assuming CardStock serviceType strings match Service model names exactly
        // We might need a lookup here or just rely on `serviceCategory` if that's consistent.
        // Let's rely on looking up the Service ID first.
        const services = await mongoose.model('Service').find({ name: serviceType });
        const serviceIds = services.map(s => s._id);
        reportFilter.serviceId = { $in: serviceIds };
    }

    const usedCount = await Report.countDocuments(reportFilter);

    // 3. Void
    const voidCount = await VoidCard.countDocuments(voidFilter);

    // 4. Left (Balance)
    // Note: 'Left' is tricky with date ranges because it's a snapshot state, not a flow.
    // Usually 'Current Balance' = Total Assigned Ever - Total Used Ever - Total Void Ever.
    // If we want "Balance remaining from the assigned batch in this date range", it's ambiguous.
    // Standard interpretation for "Report in Date Range":
    // "In this period, X were assigned, Y were used, Z were voided."
    // Current stock balance is a global state, unrelated to date range filters (usually).
    // Let's calculate Global Balance if no date range, or just flow stats if date range exists.
    
    // For the User Request: "how much assigned... how many used... how many void"
    // This implies flow within the range.
    // BUT "left cards" implies current stock. 
    // I will return flow stats for the range, and MAYBE total current balance separately?
    // Let's stick to the requested range stats first.
    
    // However, to calculate "Left", we generally need (Total Assigned - Total Used - Total Void).
    // If filtering by date, "Left" doesn't make much sense mathematically unless it means 
    // "Left from the batch assigned in this date range", which is hard to track if FIFO isn't strictly enforced.
    // I will return the raw counts and let frontend decide or just label them clearly.
    // Actually, I'll calculate "Total Left" regardless of date filter for that Woreda/Service combo.
    
    let totalAssigned = 0; 
    let totalUsed = 0; 
    let totalVoid = 0;

    if (woreda) {
       // Global stats for balance
       const allTransfers = await CardTransfer.find({ toWoreda: woreda, ...(serviceType && {serviceType}) });
       totalAssigned = allTransfers.reduce((acc, curr) => acc + curr.quantity, 0);
       
       const allReportsFilter = { woreda: woreda, cardSerial: { $exists: true, $ne: ""} };
       if (serviceType) {
           const services = await mongoose.model('Service').find({ name: serviceType });
           allReportsFilter.serviceId = { $in: services.map(s => s._id) };
       }
       totalUsed = await Report.countDocuments(allReportsFilter);
       
       totalVoid = await VoidCard.countDocuments({ woreda: woreda, ...(serviceType && {serviceType}) });
    }

    res.json({
      periodStats: {
        assigned: assignedCount,
        used: usedCount,
        void: voidCount
      },
      currentBalance: {
        assigned: totalAssigned,
        used: totalUsed,
        void: totalVoid,
        left: totalAssigned - totalUsed - totalVoid
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get Dashboard Data (Stock Overview for Subcity)
exports.getDashboardData = async (req, res) => {
    // Return total stock at subcity vs distributed
    // ... Implementation can be added later
    res.json({ message: "Dashboard data placeholder" });
}
