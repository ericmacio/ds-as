const api = require('./api');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'broadcastContent');

exports.send = async(server, playerId, configValues, broadcastContent) => {
    const caller = 'send';
    logger.log(caller, 'INFO0', 'Send new content: ');
    for(let id=0; id<broadcastContent.length; id++) {
        logger.log(caller, 'INFO0', '--- type: ' + broadcastContent[id].type);
        logger.log(caller, 'INFO0', 'name: ' + broadcastContent[id].name);
        logger.log(caller, 'INFO0', 'id: ' + broadcastContent[id].id);
        logger.log(caller, 'INFO0', 'version: ' + broadcastContent[id].version);
    }
    let sentData = "device_type=" + configValues.device_type + '&folders=' + JSON.stringify(broadcastContent);
    try {
        const result = await api.executeCmd(server.host, server.port, 'putDeviceBroadcast', '/' + playerId, sentData);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: api.executeCmd result is ko');
            return {ok: false};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: api.executeCmd failed');
        logger.error(caller, error);
        return {ok: false};
    }
    logger.log(caller, 'INFO2', 'Device broadcast info updated');
    return {ok: true};
}