const fsp = require('fs').promises;
const User = require('./user');
const AppRepository = require('../repository/apps');
const Service = require ('./service');
const { serverConfig: { appsDirectory, indexFile } } = require('../../config/asApi.json');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'App');
exports.getApps = async(userId) => {
    const caller = 'getApps';
    //Get user properties
    try {
        const userProps = await User.getUserProps(userId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanGetApps = userProps.canGetApps;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanGetApps) {
        const errorMsg = 'Forbidden action. User is not allowed to list apps. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
	try {
        const result = await AppRepository.getApps();
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: AppRepository.getApps result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing AppRepository'}};
        }
        const apps = result.data;
		return{ok: true, data: apps};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AppRepository.getApps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
}
exports.saveNewApp = async(userId, appData, srcFilePath) => {
    const caller = 'saveNewApp';
	//Get user properties
    try {
        const userProps = await User.getUserProps(userId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanCreateApp = userProps.canCreateApp;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanCreateApp) {
        const errorMsg = 'Forbidden action. User is not allowed to create any app. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
	//Move src file data from tmp file to app directory
    const srcFile = appsDirectory + '/' + appData.name + '.js'
    try {
        await fsp.rename(appData.tmpSrcFilePath, srcFile);
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: fsp.rename failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    //Set date
    const creationDate = new Date().getTime();
    const lastModificationDate = creationDate;
    //Create new app
    const appDataToSave = {
		...appData,
		srcFile,
		creationDate,
		lastModificationDate,
		owner: userId,
		organization: 'Admin'
	};
    try {
        const result = await AppRepository.saveApp(appDataToSave);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: AppRepository.saveApp result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing AppRepository'}};
        }
        logger.log(caller, 'INFO0', 'App saved: ' + appDataToSave.name);
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AppRepository.saveApp failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
	//Update index file with new app
    try {
        const newEntry = `\nexports.${appData.name} = require('./${appData.name}');`;
        await fsp.appendFile(indexFile, newEntry);
        logger.log(caller, 'DEBUG', 'Index file updated with app: ' + appData.name);
        return {ok: true};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: fsp.appendFile failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
}
exports.updateApp = async(userId, appId, appData, tmpSrcFilePath) => {
	const caller ='updateApp';
	//Get user rights
    try {
        const result = await userHasRightsOnApp(userId, appId);
        if(!result.ok) {
            const errorMsg = 'ERROR userHasRightsOnApp returned ko. userId: ' + userId;
            logger.log(caller, 'ERROR', errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanUpdateApp = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: userHasRightsOnApp failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanUpdateApp) {
        const errorMsg = 'Forbidden action. User is not allowed to update app. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
	//App name cannot be changed
	//Check if a new src file exist for this app
	if(tmpSrcFilePath) {
		//Move src file data from tmp file to app directory
		const srcFilePath = appsDirectory + '/' + appData.name + '.js'
		try {
			await fsp.rename(tmpSrcFilePath, srcFilePath);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: fsp.rename failed');
			logger.error(caller, error);
			return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
		}
		var appDataToSave = {...appData, lastModificationDate: new Date().getTime(), srcFile: srcFilePath};
	} else
		var appDataToSave = {...appData, lastModificationDate: new Date().getTime()};
	//Update app in repository
	try {
        const result = await AppRepository.updateApp(appId, appDataToSave);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: AppRepository.updateApp result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing AppRepository'}};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AppRepository.updateApp failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    //We must now inform impacted services about the change
    try {
        const result = await Service.appHasChanged({name: appDataToSave.name, color: appDataToSave.color});
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: Service.appHasChanged result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when notifying services'}};
        }
        return {ok: true};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Service.appHasChanged failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
}
exports.deleteApp = async(userId, appId) => {
	const caller = 'deleteApp';
	//Get user rights
    try {
        const result = await userHasRightsOnApp(userId, appId);
        if(!result.ok) {
            const errorMsg = 'ERROR userHasRightsOnApp returned ko. userId: ' + userId;
            logger.log(caller, 'ERROR', errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanDeleteApp = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: userHasRightsOnApp failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanDeleteApp) {
        const errorMsg = 'Forbidden action. User is not allowed to delete app. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
	//Get app data from repository
    try {
    	const result = await AppRepository.getApp(appId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: AppRepository.getApp result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing AppRepository'}};
        }
        var app = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AppRepository.getApp failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
	//Delete source file
	const srcFile = appsDirectory + '/' + app.name + '.js';
	try {
		await fsp.unlink(srcFile);
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: fsp.unlink failed');
		logger.error(caller, error);
		return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
	}
	//Modify index file
	try {
		const rawData = await fsp.readFile(indexFile, 'utf8')
		var indexData = rawData.split('\n');
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: fsp.readFile failed');
		logger.error(caller, error);
		return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
	}
	var newIndexStr;
	for(var id=0; id<indexData.length; id++) {
		const name = indexData[id].split(' = ')[0].split('.')[1];
		if(name != app.name)
			newIndexStr = newIndexStr ? newIndexStr += '\n' + indexData[id] : indexData[id];
	}
	//Update index file
	try {
		await fsp.writeFile(indexFile, newIndexStr);
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: fsp.writeFile failed');
		logger.error(caller, error);
		return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
	}
	logger.log(caller, 'DEBUG', 'Apps Index file updated');
	//Delete the app from repository
    try {
        const result = await AppRepository.deleteApp(appId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: AppRepository.deleteApp result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing AppRepository'}};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AppRepository.deleteApp failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
	logger.log(caller, 'INFO0', 'App deleted: ' + app.name);
    return {ok: true};
}
exports.getAppSrcFile = async(userId, appId) => {
	const caller = 'getAppSrc';
	//Get user rights
    try {
        const result = await userHasRightsOnApp(userId, appId);
        if(!result.ok) {
            const errorMsg = 'ERROR userHasRightsOnApp returned ko. userId: ' + userId;
            logger.log(caller, 'ERROR', errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanGetAppSrc = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: userHasRightsOnApp failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanGetAppSrc) {
        const errorMsg = 'Forbidden action. User is not allowed to access app src. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
	//Get app data from repository
    try {
    	const result = await AppRepository.getApp(appId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: AppRepository.getApp result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing AppRepository'}};
        }
        var app = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AppRepository.getApp failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
	//Read source file data from file systeme
	const srcFile = appsDirectory + '/' + app.name + '.js';
	try {
		const srcFileData = await fsp.readFile(srcFile, 'utf8');
		return {ok: true, data: srcFileData};
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: fsp.readFile failed');
		logger.error(caller, error);
		return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
	}
}
const userHasRightsOnApp = async (userId, appId) => {
    const caller = 'userHasRightsOnService';
    //Get user properties
    try {
        var userProps = await User.getUserProps(userId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    //Get app data from repository
    try {
    	const result = await AppRepository.getApp(appId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: AppRepository.getApp result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing AppRepository'}};
        }
        const app = result.data;
        const userHasRights = (app.owner == userId || userProps.isAdminOrManager);
        return {ok: true, data: userHasRights};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AppRepository.getApp failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
}