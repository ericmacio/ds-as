const mongoose = require('mongoose');

const serviceSchema = mongoose.Schema({
    app: {type: String, require: true},
    name: {type: String, require: true},
    apiUrl: {type: String, require: true},
    apiPort: {type: String, require: true},
    user: {type: String, require: false},
    password: {type: String, require: false},
    iv: {type: String, required: false},
    group: {type: String},
    color: {type: String, require: true},
    configData: {type: String, require: true},
    configFileName: {type: String},
    configFilePath: {type: String},
    owner: {type: String, require: true},
    scope: {type: String, require: true},
    creationDate: {type: String, require: true},
    organization: {type: String, require: true},
    lastModificationDate: {type: String, require: true}
});

module.exports = mongoose.model('Service', serviceSchema);