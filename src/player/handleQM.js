const api = require('./api');
const channel = require('./channel');
const folder = require('./folder');
const variable = require('./variable');
const configuration = require('./configuration');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'handleQM');

exports.execute = async(server, playerId, qmTask, configValues, mediaLibrary) => {
    const caller = 'handleQm';
    var qmType = qmTask['$']['type'];
    var qmName = qmTask['$']['name'];
    var qmId = qmTask['$']['id'];
    //Send QM start
    const sentData = "device_type=" + configValues.device_type;
    try {
        const result = await api.executeCmd(server.host, server.port, 'putQmTaskStart', '/' + qmId, sentData);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: api.executeCmd result is ko');
            logger.log(caller, 'ERROR', 'ERROR. QM processing aborted: ' + qmName);
            return {ok: false};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: api.executeCmd failed');
        logger.error(caller, error);
        return {ok: false};
    }
    //Handle QM request
    switch(qmType) {
        case 'command':
            logger.log(caller, 'INFO1', 'Receive command: ' + qmName);
            switch(qmName) {
                case 'purge_bdd':
                case 'reboot':
                case 'upload_preview':
                    var qmTaskSuccessData = {device_type: configValues.device_type, type_id: 'task'};
                    break;
                case 'update_screen':
                    try {
                        const result = await channel.getContent(server, playerId, configValues, mediaLibrary);
                        if(!result.ok) {
                            logger.log(caller, 'INFO2', 'ERROR: channel.getContent result is ko');
                            logger.log(caller, 'ERROR', 'ERROR. QM processing aborted: ' + qmName);
                            return {ok: false};
                        }
                        var qmResult = result.data;
                    } catch(error) {
                        logger.log(caller, 'ERROR', 'ERROR: channel.getContent failed');
                        logger.error(caller, error);
                        return {ok: false};
                    }
                    if(qmResult && qmResult.channelContentInfo)
                        var qmTaskSuccessData = {device_type: configValues.device_type, type_id: 'task', message: 'screen ' + qmResult.channelContentInfo.id};
                    else {
                        logger.log(caller, 'INFO2',  'WARNING: update_screen: No screen_details information provided by server');
                        var qmTaskSuccessData = {device_type: configValues.device_type, type_id: 'task'};
                    }
                    break;
                case 'update_folder':
                    var folderId = qmTask['folder_id'].toString();
                    try {
                        const result = await folder.getContent(server, playerId, folderId, mediaLibrary);
                        if(!result.ok) {
                            logger.log(caller, 'INFO2', 'ERROR: folder.getContent result is ko');
                            logger.log(caller, 'ERROR', 'ERROR. QM processing aborted: ' + qmName);
                            return {ok: false};
                        }
                        var qmResult = result.data;
                    } catch(error) {
                        logger.log(caller, 'ERROR', 'ERROR: folder.getContent failed');
                        logger.error(caller, error);
                        return {ok: false};
                    }
                    var qmTaskSuccessData = {device_type: configValues.device_type, type_id: 'task'};
                    break;
                case 'update_variable':
                    try {
                        const result = await variable.update(server, playerId, configValues);
                        if(!result.ok) {
                            logger.log(caller, 'INFO2', 'ERROR: variable.update result is ko');
                            logger.log(caller, 'ERROR', 'ERROR. QM processing aborted: ' + qmName);
                            return {ok: false};
                        }
                        var qmResult = result.data;
                    } catch(error) {
                        logger.log(caller, 'ERROR', 'ERROR: variable.update failed');
                        logger.error(caller, error);
                        return {ok: false};
                    }
                    var qmTaskSuccessData = {device_type: configValues.device_type, type_id: 'task'};
                    break;
                default:
                    logger.log(caller, 'ERROR', 'ERROR: QM command name not supported: ' + qmName);
                    var qmTaskSuccessData = {device_type: configValues.device_type, type_id: 'task'};
                    break;
            }
        break;
        case 'set':
            switch(qmName) {
                case 'config':
                    const newConfig = qmTask;
                    try {
                        const result = await configuration.update(server, playerId, configValues, newConfig);
                        if(!result.ok) {
                            logger.log(caller, 'INFO2', 'ERROR: configuration.update result is ko');
                            logger.log(caller, 'ERROR', 'ERROR. QM processing aborted: ' + qmName);
                            return {ok: false};
                        }
                        var qmResult = result.data;
                    } catch(error) {
                        logger.log(caller, 'ERROR', 'ERROR: configuration.update failed');
                        logger.error(caller, error);
                        return {ok: false};
                    }
                    var qmTaskSuccessData = {device_type: configValues.device_type, type_id: 'task'};
                    break;
                default:
                    logger.log(caller, 'ERROR', 'ERROR: QM set name not supported: ' + qmName);
                    break;
            }
            break;
        default:
            logger.log(caller, 'ERROR', 'ERROR: QM type not supported: ' + qmType);
            break;
    }
    //Send QM Success
    if(qmType != 'reboot') {
        try {
            const result = await api.executeCmd(server.host, server.port, 'postQmTaskSuccess', '/' + qmId, qmTaskSuccessData);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: api.executeCmd result is ko');
                return {ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: api.executeCmd failed');
            logger.error(caller, error);
            return {ok: false};
        }
    }
    return {ok: true, data: qmResult};
}