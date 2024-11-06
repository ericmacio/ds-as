const User = require('../../domain/user');
const { errorCode } = require('./controllers.json');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'usersController');

exports.getUsers = async(req, res, next) => {
    const caller = 'getUsers';
    //Get userId from request
    const requestUserId = req.userId;
    try {
        const result = await User.getUsers(requestUserId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: User.getUsers result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot get users'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot get users'}});
            return;
        }
        const users = result.data;
        res.status(200).send({ok: true, error: null, data: users});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: User.getUsers failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot get users list. Error: ' + error}});
    }
}
exports.putUser = async (req, res, next) => {
    const caller = 'putUser';
    //Get userId from request
    const requestUserId = req.userId;
    const userId = req.params['id'];
    const userData = req.body;
    try {
        const result = await User.updateUser(requestUserId, userId, userData);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: User.updateUser result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot update user'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot update user'}});
            return;
        }
        res.status(200).send({ok: true, error: null, data: 'User modified'});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: User.updateUser failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot modify user. Error: ' + error}});
    }
}
exports.postUser = async(req, res, next) => {
    const caller = 'postUser';
    //Get userId from request
    const requestUserId = req.userId;
    const userData = req.body;
    try {
        const result = await User.createNewUser(requestUserId, userData);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: User.createNewUser result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot create user'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot create user'}});
            return;
        }
        res.status(200).send({ok: true, error: null, data: 'User created: ' + userData.name});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: User.createNewUser failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot modify user. Error: ' + error}});
    }
}
exports.deleteUser = async(req, res, next) => {
    const caller = 'deleteUser';
    //Get userId from request
    const requestUserId = req.userId;
    //Delete an existing user
    const userId = req.params['id'];
    try {
        const result = await User.deleteUser(requestUserId, userId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: User.deleteUser result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot delete user'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot delete user'}});
            return;
        }
        res.status(200).send({ok: true, error: null, data: 'User deleted'});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: User.deleteUser failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot delete user. Error: ' + error}});
    }
}