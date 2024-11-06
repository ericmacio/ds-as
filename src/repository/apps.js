const AppDb = require('./models/app');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'AppsRepository');

exports.getApps = async () => {
    const caller = 'getApps';
    try {
		const appsDb = await AppDb.find();
        const apps = appsDb.map(appDb => {return setApp(appDb);});
        return {ok: true, data: apps}
	} catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AppDb.find failed');
        logger.error(caller, error);
		return {ok: false};
	}
}
exports.saveApp = async(appData) => {
    const caller = 'saveApp';
    const appDb = new AppDb(appData);
    //Save new service into database
    try {
        await appDb.save();
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: appDb.save failed');
        logger.error(caller, error);
        return {ok: false};
    }
    return {ok: true};
}
exports.getApp = async(appId) => {
    const caller = 'getApp';
    //Get app from database
    try {
        const appDbData = await AppDb.findById(appId);
        const appData = setApp(appDbData);
        return {ok: true, data: appData};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AppDb.findById failed');
        logger.error(caller, error);
        return {ok: false};
    }
}
exports.deleteApp = async(appId) => {
    const caller = 'deleteApp';
    //Delete app from database
    try {
        await AppDb.findByIdAndDelete(appId);
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AppDb.findByIdAndDelete failed');
        logger.error(caller, error);
        return {ok: false}
    }
    return {ok: true};
}
exports.updateApp = async(appId, appData) => {
    const caller = 'updateApp';
    //Update app in database
    try {
        await AppDb.updateOne({_id: appId}, {...appData});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AppDb.updateOne failed');
        logger.error(caller, error);
        return {ok: false}
    }
    return {ok: true};
}
setApp = (appDbData) => {
    const caller = 'setApp';
    const app = {
        id: appDbData._id.toString(),
        name: appDbData.name,
        color: appDbData.color,
        srcFile: appDbData.srcFile,
        origSrcFileName: appDbData.origSrcFileName,
        owner: appDbData.owner,
        creationDate: appDbData.creationDate,
        organization: appDbData.organization,
        scope: appDbData.scope ? appDbData.scope : null,
        lastModificationDate: appDbData.lastModificationDate
    };
    return app;
}