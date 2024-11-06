const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const agentSchema = mongoose.Schema({
    hostName: { type: String, required: true },
    registrationTime: { type: Number },
    lastRegistrationTime: { type: Number },
    expires: { type: Number },
    lastHeartbeatTime: { type: Number },
    network: { type: String },
    creationDate: {type: String, require: true},
    lastModificationDate: {type: String, require: true},
    coreVersion: {type: String},
    agentVersion: {type: String}
});

agentSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Agent', agentSchema);