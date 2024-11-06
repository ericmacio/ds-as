const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const UserRepository = require('../../repository/users');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'authController');
const config = require('../../../config/auth.json');

mongoose.connect('mongodb://localhost/ds-as', { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });

const jwtLoginKey = 'erivd4rvnsTV'; //12char
const jwtRefreshKey = 'jdlzovsoihAd5GT5rv5oihz68ervoijsovkj'; //36char
const algorithm = 'HS256';

exports.getJwtLoginKey =() => {return jwtLoginKey};

exports.login = async(req, res, next) => {
    const caller = 'login';
    //Find user from database
    try {
        const result = await UserRepository.findUser({email: req.body.email});
        if(!result.ok)
            logger.log(caller, 'ERROR', 'ERROR: UserRepository.findUser result is ko.');
        else
            var user = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserRepository.findUser failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'UserRepository.findUser failed. Error: ' + error}});
        return;
    }
    if(!user) {
        logger.log(caller, 'ERROR', 'ERROR: user not found: ' + req.body.email);
        res.status(404).send({ok: false, error: {msg: 'Unknown user: ' + req.body.email}});
        return;
    }
    //Check password
    try {
        const valid = await bcrypt.compare(req.body.password, user.password);
        if (!valid) {
            logger.log(caller, 'ERROR', 'ERROR: Incorrect password for user: ' + req.body.email);
            res.status(401).send({ok: false, error: {msg: 'Password is incorrect'}});
        } else {
            logger.log(caller, 'INFO0', 'User has been successfully authenticated: ' + user.name)
            //User has been successfully authenticated. Send him back a valid token
            const accessToken = jwt.sign({userId: user.id}, jwtLoginKey, {algorithm: algorithm, expiresIn: config.accessExpirySeconds });
            const refreshToken = jwt.sign({userId: user.id}, jwtRefreshKey, {algorithm: algorithm, expiresIn: config.refreshExpirySeconds });
            //Update user info with refresh token and lastLoginDate
            const lastLoginDate = new Date().getTime();
            const userDataToSave = { refreshToken, lastLoginDate, mustLogout: false, isLogged: true };
            try {
                const result = await UserRepository.updateUser(user.id, userDataToSave);
                if(!result.ok) {
                    logger.log(caller, 'ERROR', 'ERROR: UserRepository.updateUser result is ko.');
                    res.status(400).send({ok: false, error: {msg: 'UserRepository.updateUser result is ko'}});
                    return;
                }
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: UserRepository.updateUser failed');
                logger.error(caller, error);
                res.status(400).send({ok: false, error: {msg: 'UserRepository.updateUser failed. Error: ' + error}});
                return;
            }
            const { id, firstName, name, email} = user;
            res.status(200).send({ok: true, error: null, data: {id: id, firstName, name, email, access_token: accessToken, refresh_token: refreshToken, expired: config.accessExpirySeconds}});
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: bcrypt.compare failed');
        res.status(400).send({ok: false, error: {msg: 'bcrypt.compare failed. Error: ' + error}});
    };
};
exports.logout = async(req, res, next) => {
    const caller = 'logout';
    //Find user from database
    try {
        const result = await UserRepository.findUser({email: req.body.email});
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: UserRepository.findUser result is ko.');
            res.status(400).send({ok: false, error: {msg: 'UserRepository.findUser result is ko'}});
            return;
        }
        var user = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserRepository.findUser failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'UserRepository.findUser failed. Error: ' + error}});
        return;
    }
    if(!user) {
        logger.log(caller, 'ERROR', 'ERROR: user not found: ' + req.body.email);
        res.status(404).send({ok: false, error: {msg: 'Unknown user: ' + req.body.email}});
        return;
    }
    //User has been successfully authenticated. Send him back a valid token
    const refreshToken = null;
    //Update user info with refresh token and lastLogoutDate
    const lastLogoutDate = new Date().getTime();
    const userDataToSave = { refreshToken, mustLogout: false, lastLogoutDate, isLogged: false };
    try {
        const result = await UserRepository.updateUser(user.id, userDataToSave);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: UserRepository.updateUser result is ko.');
            res.status(400).send({ok: false, error: {msg: 'UserRepository.updateUser result is ko'}});
            return;
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserRepository.updateUser failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'UserRepository.updateUser failed. Error: ' + error}});
        return;
    }
    logger.log(caller, 'INFO0', 'User logout successful: ' + req.body.email);
    res.status(200).send({ok: true, error: null, data: { email: req.body.email }});
};
exports.setPassword = async(req, res, next) => {
    const caller = 'setPassword';
    //Find user from database
    try {
        const result = await UserRepository.findUser({email: req.body.email});
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: UserRepository.findUser result is ko.');
            res.status(400).send({ok: false, error: {msg: 'UserRepository.findUser result is ko'}});
            return;
        }
        var user = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserRepository.findUser failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'UserRepository.findUser failed. Error: ' + error}});
        return;
    }
    if(!user) {
        logger.log(caller, 'ERROR', 'ERROR: user not found: ' + req.body.email);
        res.status(404).send({ok: false, error: {msg: 'Unknown user: ' + req.body.email}});
        return;
    }
    //Check if password has been changed
    try {
        var samePassword = await bcrypt.compare(req.body.password, user.password);
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: bcrypt.compare failed');
        res.status(400).send({ok: false, error: {msg: 'bcrypt.compare failed. Error: ' + error}});
        return;
    };
    if (samePassword) {
        logger.log(caller, 'INFO0', 'Same password for user: ' + req.body.email);
        res.status(200).send({ok: true, error: null, data: { samePassword }});
    } else {
        logger.log(caller, 'INFO0', 'Set different password for user: ' + user.name);
        try {
            var hashedPassword = await bcrypt.hash(req.body.password, 10);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: bcrypt.hash failed');
            logger.error(caller, error);
            res.status(400).send({ok: false, error: {msg: 'Cannot crypt password. Error: ' + error}});
            return;
        }
        const passwordDate = new Date().getTime();
        //Update password in database
        const userDataToSave = { password: hashedPassword, passwordDate };
        try {
            const result = await UserRepository.updateUser(user.id, userDataToSave);
            if(!result.ok) {
                logger.log(caller, 'ERROR', 'ERROR: UserRepository.updateUser result is ko.');
                res.status(400).send({ok: false, error: {msg: 'UserRepository.updateUser result is ko'}});
                return;
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: UserRepository.updateUser failed');
            logger.error(caller, error);
            res.status(400).send({ok: false, error: {msg: 'UserRepository.updateUser failed. Error: ' + error}});
            return;
        }
        logger.log(caller, 'INFO0', 'User password updated for user: ' + user.name);
        res.status(200).send({ok: true, error: null, data: { samePassword }});
    }
};
exports.refresh = async(req, res, next) => {
    const caller = 'refresh';
    //Check user refresh token
    var refreshToken = req.body.token;
    try {
        var decodedToken = jwt.verify(refreshToken, jwtRefreshKey);
    } catch(error) {
        if (error instanceof jwt.JsonWebTokenError) {
            // if the error thrown is because the JWT is unauthorized, return a 403 error
            logger.log(caller, 'ERROR', 'ERROR: Forbidden access. Refresh token not valid: ' + error);
            res.status(403).send({ok: false, error: {msg: 'Forbidden request. . Refresh token not valid. ' + error}});
            return;
		} else {
            // otherwise, return a bad request error
            logger.log(caller, 'ERROR', 'ERROR: Invalid request: ' + error);
            res.status(400).send({ok: false, error: {msg: 'Invalid request: ' + error}});
            return;
        }
    }
    if(decodedToken) {
        var userId = decodedToken.userId;
        //We must check that refresh token match with user's one
        try {
            const result = await UserRepository.getUserAllData(userId);
            if(!result.ok) {
                logger.log(caller, 'ERROR', 'ERROR: UserRepository.getUserAllData result is ko.');
                res.status(400).send({ok: false, error: {msg: 'UserRepository.getUserAllData result is ko'}});
                return;
            }
            var user = result.data;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: UserRepository.getUserAllData failed');
            logger.error(caller, error);
            res.status(400).send({ok: false, error: {msg: 'UserRepository.getUserAllData failed. Error: ' + error}});
            return;
        }
        if(!user) {
            logger.log(caller, 'ERROR', 'ERROR: user not found. Id: ' + userId);
            res.status(404).send({ok: false, error: {msg: 'Unknown user. Id: ' + userId}});
            return;
        } else {
            //Check refreshToken
            if(refreshToken != user.refreshToken) {
                logger.log(caller, 'ERROR', 'ERROR: Forbidden request. Refresh token does not match');
                res.status(403).send({ok: false, error: {msg: 'Forbidden request. Refresh token does not match'}});
                return;
            }
        }
        // Now, create a new token for the current user, with a renewed expiration time
        const newAccessToken = jwt.sign({userId: userId}, jwtLoginKey, {algorithm: algorithm, expiresIn: config.accessExpirySeconds });
        const newRefreshToken = jwt.sign({userId: userId}, jwtRefreshKey, {algorithm: algorithm, expiresIn: config.refreshExpirySeconds });
        //Store the new refresh token for this user
        const userDataToSave = { refreshToken: newRefreshToken};
        try {
            const result = await UserRepository.updateUser(userId, userDataToSave);
            if(!result.ok) {
                logger.log(caller, 'ERROR', 'ERROR: UserRepository.updateUser result is ko.');
                res.status(400).send({ok: false, error: {msg: 'UserRepository.updateUser result is ko'}});
                return;
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: UserRepository.updateUser failed');
            logger.error(caller, error);
            res.status(400).send({ok: true, error: null, data: 'Cannot update refresh token for user. Erro: ' + error});
            return;
        }
        res.status(200).send({ok: true, error: null, data: {userId: userId, access_token: newAccessToken, refresh_token: newRefreshToken, expired: config.accessExpirySeconds}});
    } else {
        logger.log(caller, 'ERROR', 'ERROR: decodedToken is undefined: ' + error);
        res.status(400).send({ok: false, error: {msg: 'decoded token undefined: ' + error}});
        return;
    }
};