const mongoose = require('mongoose');

const appSchema = mongoose.Schema({
    name: {type: String, require: true},
    color: {type: String, require: true},
    srcFile: {type: String, require: true},
    origSrcFileName: {type: String, require: true},
    owner: {type: String, require: true},
    scope: {type: String, require: true},
    creationDate: {type: String, require: true},
    lastModificationDate: {type: String, require: true},
    organization: {type: String, require: true}
});

module.exports = mongoose.model('App', appSchema);