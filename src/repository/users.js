const UserDb = require('./models/user');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'UsersRepository');

exports.getUsers = async () => {
    const caller = 'getUsers';
    try {
		const usersDb = await UserDb.find();
        const users = usersDb.map(userDb => {return setUser(userDb);});
        return {ok: true, data: users}
	} catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserDb.find failed');
        logger.error(caller, error);
		return {ok: false};
	}
}
exports.getUser = async (userId) => {
    const caller = 'getUsers';
    try {
		const usersDbData = await UserDb.findById(userId);
        const userData = setUser(usersDbData);
        return {ok: true, data: userData};
	} catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserDb.findById failed');
        logger.error(caller, error);
		return {ok: false};
	}
}
//Internal use only. Do not expose. We return all user information including password
exports.getUserAllData = async (userId) => {
    const caller = 'getUsers';
    try {
		const usersDbData = await UserDb.findById(userId);
        const userData = setUserAllData(usersDbData);
        return {ok: true, data: userData};
	} catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserDb.findById failed');
        logger.error(caller, error);
		return {ok: false};
	}
}
//Internal use only. Do not expose. We return all user information including password
exports.findUser = async (userSelector) => {
    const caller = 'getUsers';
    try {
		const usersDbData = await UserDb.findOne(userSelector);
        const userData = setUserAllData(usersDbData);
        return {ok: true, data: userData};
	} catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserDb.findById failed');
        logger.error(caller, error);
		return {ok: false};
	}
}
exports.saveUser = async (userData) => {
    const caller = 'saveUser';
    const userDb = new UserDb(userData);
    try {
		await userDb.save();
	} catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: userDb.save failed');
        logger.error(caller, error);
		return {ok: false};
	}
    return {ok: true};
}
exports.updateUser = async(userId, userData) => {
    const caller = 'updateUser';
    logger.log(caller, 'DEBUG', 'userId: ' + userId);
    logger.log(caller, 'DEBUG', 'userData: ' + JSON.stringify(userData));
    //Update user in database
    try {
        await UserDb.updateOne({_id: userId}, {...userData});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserDb.updateOne failed');
        logger.error(caller, error);
        return {ok: false}
    }
    return {ok: true};
}
exports.deleteUser = async (userId) => {
    const caller = 'deleteUser';
    //Delete user from database
    try {
		await UserDb.findByIdAndDelete(userId);
	} catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: UserDb.findById failed');
        logger.error(caller, error);
		return {ok: false};
	}
    return {ok: true};
}
setUser = (userDbData) => {
    const caller = 'setUser';
    const user = {
        id: userDbData._id.toString(),
        creationDate: userDbData.creationDate,
        email: userDbData.email,
        firstName: userDbData.firstName,
        lastLoginDate: userDbData.lastLoginDate,
        lastLogoutDate: userDbData.lastLogoutDate,
        name: userDbData.name,
        organization: userDbData.organization,
        role: userDbData.role,
        mustLogout: userDbData.mustLogout,
        isLogged: userDbData.isLogged
    };
    return user;
}
setUserAllData = (userDbData) => {
    const caller = 'setUser';
    const user = {
        id: userDbData._id.toString(),
        password: userDbData.password,
        refreshToken: userDbData.refreshToken,
        creationDate: userDbData.creationDate,
        email: userDbData.email,
        firstName: userDbData.firstName,
        lastLoginDate: userDbData.lastLoginDate,
        lastLogoutDate: userDbData.lastLogoutDate,
        name: userDbData.name,
        organization: userDbData.organization,
        role: userDbData.role,
        mustLogout: userDbData.mustLogout,
        isLogged: userDbData.isLogged
    };
    return user;
}