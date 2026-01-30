const mongoose = require('mongoose');

// We don't export a compiled model directly because we need to attach it to the connection dynamically
// or we export a schema and a helper to get the model from the connection.

const remoteOfficerSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        minlength: 3,
        maxlength: 50,
    },
    phone: {
        type: String,
        required: true,
       // unique: true // Unique index might fail if not created on remote DB manually, but we hope schema match
    },
    password: {
        type: String,
        required: true,
        minlength: 6, 
    },
    woreda: {
        type: String,
        trim: true,
    },
    hospitalName: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    role: {
        type: String,
        default: "User",
    },
    // New field to link to Atlas original doc
    atlasId: {
        type: mongoose.Schema.Types.ObjectId,
        unique: true,
        sparse: true // Only synced docs will have this
    }
}, { timestamps: true });

// Compile the model for the local database connection
const RemoteOfficer = mongoose.model('RemoteOfficer', remoteOfficerSchema);

// Helper to get or create the model on the specific connection (for Atlas)
const getRemoteOfficerModel = (connection) => {
    if (connection.models.Officer) {
        return connection.models.Officer;
    }
    return connection.model('Officer', remoteOfficerSchema);
};

module.exports = RemoteOfficer;
module.exports.getRemoteOfficerModel = getRemoteOfficerModel;
