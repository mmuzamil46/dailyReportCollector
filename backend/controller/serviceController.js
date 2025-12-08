const Service = require('../models/Service');

// @desc    Get all services
// @route   GET /api/services
// @access  Private (Admin)
const getServices = async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ createdAt: 1 });
    res.status(200).json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching services' });
  }
};

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  Private (Admin)
const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service || !service.isActive) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching service' });
  }
};

// @desc    Create a new service
// @route   POST /api/services
// @access  Private (Admin)
const createService = async (req, res) => {
  const { name, description, yearlyPlan } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Service name is required' });
  }

  try {
    const service = new Service({
      name,
      description,
      yearlyPlan: yearlyPlan !== undefined ? Number(yearlyPlan) : null,
      createdBy: req.user.id,
    });
    const createdService = await service.save();
    
    const io = req.app.get('io');
    io.emit('serviceCreated', { message: 'New service created', serviceId: createdService._id });

    res.status(201).json(createdService);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while creating service' });
  }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private (Admin)
const updateService = async (req, res) => {
  const { name, description, yearlyPlan, isActive } = req.body;

  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    service.name = name || service.name;
    service.description = description || service.description;
    service.yearlyPlan = yearlyPlan !== undefined ? Number(yearlyPlan) : service.yearlyPlan;
    service.isActive = isActive !== undefined ? isActive : service.isActive;
    service.updatedBy = req.user.id;

    const updatedService = await service.save();

    const io = req.app.get('io');
    io.emit('serviceUpdated', { message: 'Service updated', serviceId: updatedService._id });

    res.status(200).json(updatedService);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while updating service' });
  }
};

// @desc    Soft delete a service
// @route   DELETE /api/services/:id
// @access  Private (Admin)
const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    service.isActive = false;
    await service.save();
    res.status(200).json({ message: 'Service deactivated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while deleting service' });
  }
};

module.exports = { getServices, getServiceById, createService, updateService, deleteService };