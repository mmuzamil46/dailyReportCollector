const mongoose = require('mongoose');

let atlasConnection = null;

const connectToAtlas = async () => {
    if (atlasConnection && atlasConnection.readyState === 1) {
        return atlasConnection;
    }

    const atlasUri = process.env.REMOTE_MONGO_URI;
    if (!atlasUri) {
        console.warn('REMOTE_MONGO_URI not found in environment variables. Remote features disabled.');
        return null;
    }

    try {
        atlasConnection = mongoose.createConnection(atlasUri);
        
        // Wait for connection to be established
        await new Promise((resolve, reject) => {
            atlasConnection.once('connected', () => {
                console.log('Connected to MongoDB Atlas (Shared Connection)');
                resolve();
            });
            atlasConnection.once('error', (err) => {
                console.error('Atlas connection error:', err);
                reject(err);
            });
        });
        
        return atlasConnection;
    } catch (error) {
        console.error('Error connecting to Atlas:', error);
        atlasConnection = null;
        return null;
    }
};

module.exports = { connectToAtlas };
