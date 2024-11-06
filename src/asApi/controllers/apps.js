const App = require('../../domain/app');
const { errorCode } = require('./controllers.json');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'AppsController');

exports.getApps = async(req, res, next) => {
    const caller = 'getApps';
    const userId = req.userId;
    //Get the list of apps
    try {
        const result = await App.getApps(userId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: App.getApps result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot get apps'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot get apps'}});
            return;
        }
        const apps = result.data;
        res.status(200).send({ok: true, error: null, data: apps});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: App.getApps failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot get apps list. Error: ' + error}});
    }
}
exports.postApp  = async (req, res, next) => {
    const caller = 'postApp';
    //Get userId from request
    const userId = req.userId;
    //Get app data from request body data
    const appData = req.body;
    //Check if a src file exist for this app
    if(!appData.tmpSrcFilePath) {
        logger.log(caller, 'ERROR', 'ERROR: appData.tmpSrcFilePath undefined');
        res.status(400).send({ok: false, error: {msg: 'Error app src file has not been specified'}});
        return;
    }
    //Save new app
    try {
        const result = await App.saveNewApp(userId, appData, appData.tmpSrcFilePath);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: App.saveNewApp result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot save app'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot save app'}});
            return;
        } else
            res.status(200).send({ok: true, error: null, data: 'App created'});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: App.saveNewApp failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot save new app'}});
        return;
    }
}
exports.putApp  = async (req, res, next) => {
    const caller = 'putApp';
    //Get userId from request
    const userId = req.userId;
    //Modify an existing app
    const appId = req.params['id'];
    //Get app data from request body
    const appData = req.body;
    //Update service
    try {
        const result = await App.updateApp(userId, appId, appData, appData.tmpSrcFilePath);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: App.updateApp result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot update app'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot update app'}});
        } else
            res.status(200).send({ok: true, error: null, data: 'App updated'});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: App.updateApp failed');
        logger.error(caller, error);
        res.status(404).send({ok: false, error: {msg: 'Cannot update app. Error: ' + error}});
        return;
    }
}
exports.deleteApp  = async (req, res, next) => {
    const caller = 'deleteApp';
    //Get userId from request
    const userId = req.userId;
    //Delete an existing app from database
    const appId = req.params['id'];
    //Delete it from database content
    try {
        const result = await App.deleteApp(userId, appId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: App.deleteApp result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot delete app'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot delete app'}});
            return;
        } else
            res.status(200).send({ok: true, error: null, data: 'App deleted'});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: App.deleteApp failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot delete app'}});
        return;
    }
}
exports.getAppSrcFile = async(req, res, next) => {
    const caller = 'getAppSrc';
    //Get userId from request
    const userId = req.userId;
    //Get app id from request params
    const appId = req.params['id'];
    try {
        const result = await App.getAppSrcFile(userId, appId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: App.getAppSrc result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot get app source file'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot get app source file'}});;
            return;
        } else {
            const srcFileData = result.data;
            res.status(200).send({ok: true, error: null, data: srcFileData});
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: App.getAppSrc failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot get app source file'}});
        return;
    }
}