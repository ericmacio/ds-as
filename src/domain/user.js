const bcrypt = require('bcrypt');
const UserRepository = require('../repository/users');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'User');

const ADMIN = 'admin';
const MANAGER = 'manager';
const USER = 'user';

exports.getUsers = async(requestUserId) => {
    const caller = 'getUsers';
    try {
        const userProps = await exports.getUserProps(requestUserId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanGetUsers = userProps.canGetUsers;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false}
    }
    if(!userCanGetUsers) {
        const errorMsg = 'Forbidden action. User is not allowed to get users list. userId: ' + requestUserId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
	try {
        const result = await UserRepository.getUsers();
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: UserRepository.getUsers result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing UserRepository'}};
        }
        const users = result.data;
		return{ok: true, data: users};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserRepository.getUsers failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
}
exports.updateUser = async(requestUserId, userId, userData) => {
    const caller = 'getUsers';
    try {
        const userProps = await exports.getUserProps(requestUserId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanModifyUser = userProps.canModifyUser;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanModifyUser) {
        const errorMsg = 'Forbidden action. User is not allowed to modify user. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
    //Update user in repository
    const userDataToSave = {...userData, mustLogout: true, refreshToken: null};
    try {
        const result = await UserRepository.updateUser(userId, userDataToSave);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: UserRepository.updateUser result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing UserRepository'}};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserRepository.updateUser failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    logger.log(caller, 'INFO0', 'User updated: ' + userDataToSave.name);
    return {ok: true};
}
exports.createNewUser = async(requestUserId, userData) => {
    const caller = 'createNewUser';
    try {
        const userProps = await exports.getUserProps(requestUserId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanCreateUser = userProps.canCreateUser;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false}
    }
    if(!userCanCreateUser) {
        const errorMsg = 'Forbidden action. User is not allowed to create user. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
    //Save new user in repository
    try {
        var hashedPassword = await bcrypt.hash(userData.password, 10);
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: bcrypt.hash failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    const creationDate = new Date().getTime();
    const passwordDate = creationDate;
    const lastLoginDate = 'unset';
    const lastLogoutDate = 'unset';
    const mustLogout = false;
    const isLogged = false;
    const refreshToken = 'none';
    const userDataToSave = { ...userData, password: hashedPassword, creationDate, passwordDate, lastLoginDate, lastLogoutDate, mustLogout, isLogged, refreshToken };
    try {
        const result = await UserRepository.saveUser(userDataToSave);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: UserRepository.updateUser result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing UserRepository'}};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserRepository.updateUser failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    logger.log(caller, 'INFO0', 'User updated: ' + userDataToSave.name);
    return {ok: true};
}
exports.deleteUser = async(requestUserId, userId) => {
    const caller = 'deleteUser';
    try {
        const userProps = await exports.getUserProps(requestUserId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanDeleteUser = userProps.canDeleteUser;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(userCanDeleteUser) {
        const errorMsg = 'Forbidden action. User is not allowed to delete user. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
    //Delete the user from repository
    try {
        const result = await UserRepository.deleteUser(userId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: UserRepository.deleteUser result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing UserRepository'}};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserRepository.deleteUser failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
	logger.log(caller, 'INFO0', 'User deleted');
    return {ok: true};
}
exports.getUserProps = async(userId) => {
    const caller = 'getUserProps';
    try {
        const result = await UserRepository.getUser(userId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: UserRepository.getUser result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing UserRepository'}};
        }
        const user = result.data;
        const userRights = {
            isAdmin: (user.role == ADMIN),
            isAdminOrManager: (user.role == ADMIN || user.role == MANAGER),
            canGetApps: (user.role == ADMIN || user.role == MANAGER),
            canGetAgents: (user.role == ADMIN || user.role == MANAGER),
            canCreateApp: (user.role == ADMIN || user.role == MANAGER),
            canDeleteApp: (user.role == ADMIN || user.role == MANAGER),
            canModifyApp: (user.role == ADMIN || user.role == MANAGER),
            canGetAppSrc: (user.role == ADMIN || user.role == MANAGER),
            canGetServices: (user.role == ADMIN || user.role == MANAGER || user.role == USER),
            canCreateService: (user.role == ADMIN || user.role == MANAGER || user.role == USER),
            canStartService: (user.role == ADMIN || user.role == MANAGER),
            canDeleteService: (user.role == ADMIN || user.role == MANAGER),
            canModifyService: (user.role == ADMIN || user.role == MANAGER),
            canCreateUser: (user.role == ADMIN),
            canDeleteUser: (user.role == ADMIN),
            canModifyUser: (user.role == ADMIN),
            canGetUsers: (user.role == ADMIN || user.role == MANAGER),
            canGetConfig: (user.role == ADMIN || user.role == MANAGER || user.role == USER),
            canCreateAgent: (user.role == ADMIN || user.role == MANAGER),
            canDeleteAgent: (user.role == ADMIN || user.role == MANAGER),
            canModifyAgent: (user.role == ADMIN || user.role == MANAGER),
            canSetAgent: (user.role == ADMIN || user.role == MANAGER),
            mustLogout: (user.mustLogout)
        };
        return userRights;
	} catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserRepository.getUser failed');
        logger.error(caller, error);
		return null;
	}
}