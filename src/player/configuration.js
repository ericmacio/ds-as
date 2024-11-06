const api = require('./api');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'configuration');
const {configKeyList} = require('./configuration.json');

exports.send = async(server, playerId, configValues) => {
    const caller = 'send';
    const urlPath = '/' + playerId;
    const headers = {};
    var currentConfig = {};
    for(let id=0; id<configKeyList.length; id++) {
        let key = configKeyList[id];
        currentConfig[key] = configValues[key];
    }
    logger.log(caller, 'DEBUG', 'currentConfig: ' + JSON.stringify(currentConfig));
    const sentData = "device_type=" + configValues.device_type + "&config=" + JSON.stringify(currentConfig);
    logger.log(caller, 'DEBUG', 'Send configuration message: ' + sentData);
    logger.log(caller, 'INFO1', 'Send configuration');
    try {
        const result = await api.sendCmdAndParseResult(server.host, server.port, 'putConfiguration', headers, urlPath, sentData);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: api.sendCmdAndParseResult result is ko');
            return {ok: false};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: api.sendCmdAndParseResult failed');
        logger.error(caller, error);
        return {ok: false};
    }
    logger.log(caller, 'INFO2', 'Configuration has been sent');
    return {ok: true};
}
exports.update = async(server, playerId, configValues, newConfig) => {
    const caller ='update';
    var configKeyList = [];
    var configData = {};
    for(var key in newConfig) {
        if(key != '$') {
            logger.log(caller, 'DEBUG', 'Config key: ' + key + ', value: ' + newConfig[key]);
            configData[key] = newConfig[key];
            if(configValues[key] != newConfig[key]) {
                logger.log(caller, 'INFO2', 'Config key: ' + key + ', with value: ' + newConfig[key] + ' must be updated');
                configValues[key] = newConfig[key].toString();
                logger.log(caller, 'INFO1', 'New value for config key: ' + key + ', value: ' + configValues[key]);
                configKeyList.push(key);
            }
        }
    }
    if(configKeyList.length == 0)
        logger.log(caller, 'INFO1', 'No configuration change');
    //Send back player configuration change to the server
    try {
        const result = await exports.send(server, playerId, configValues);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: start result is ko');
            return {ok: false};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: start failed');
        logger.error(caller, error);
        return {ok: false};
    }
    return {ok: true, data: configData};
}