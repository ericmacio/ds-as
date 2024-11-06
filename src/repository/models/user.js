const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = mongoose.Schema({
    role: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    firstName: { type: String, required: true },
    organization: { type: String, required: true },
    creationDate: { type: String, required: true },
    lastLoginDate: { type: String, required: true },
    lastLogoutDate: { type: String, required: true },
    passwordDate: { type: String, required: true },
    refreshToken: { type: String, required: true },
    mustLogout: { type: Boolean, required: true },
    isLogged: { type: Boolean, required: true }
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);