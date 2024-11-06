
const api = require('./api');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'variable');

exports.update = async(server, playerId, config) => {
    const caller = 'update';
    var urlPath = '/' + playerId + '?device_type=' + config.device_type + '&ip=' + config.ip + '&value_in_tag=true';
    try {
        const result = await api.executeCmd(server.host, server.port, 'getVariablesToBroadcast', urlPath, null);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: api.executeCmd result is ko');
            logger.log(caller, 'ERROR', 'ERROR. QM processing aborted: ' + qmName);
            return {ok: false};
        }
        var serverData = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: api.executeCmd failed');
        logger.error(caller, error);
        return {ok: false};
    }
    var variableList = serverData['server_response']['screen_variable_list'][0]['screen_variable'];
    for(var id=0; id<variableList.length; id++)
        logger.log(caller, 'INFO0', 
            'type: ' + variableList[id]['$']['type'] + 
            ', key: ' + variableList[id]['$']['key'] + 
            ', value_in: ' + variableList[id]['$']['value_in'] + 
            ', value: ' + variableList[id]['value'][0]);
    return {ok: true, data: variableList};
}