const api = require('./api');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'register');

exports.sendRegister = async(server, configValues) => {
    const caller = 'register';
    const headers = {};
    var urlPath;
    const sentData = {
        device_type :  configValues.device_type,
        computername : configValues.computername,
        macaddress : configValues.macaddress,
        organisation : configValues.organization,
        version : configValues.version,
        codekey : configValues.codekey,
        licence : configValues.licence,
        virtual : configValues.virtual,
        player_id : ''
    }
    logger.log(caller, 'INFO1', 'Registering player');
    logger.log(caller, 'DEBUG', 'Player data: ' + sentData);
    try {
        const result = await api.sendCmdAndParseResult(server.host, server.port, 'postRegister', headers, urlPath, sentData);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: api.sendCmdAndParseResult result is ko');
            return {ok: false};
        }
        var parseData = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: SendCmd failed');
        logger.error(caller, error);
        return {ok: false};
    }
    //Get player id from registration server response
    const playerId = parseData['server_response']['player_register'][0]['$']['player_id'];
    //Get player start time
    var date = new Date();
    const startTime = date.getFullYear() + '/' + date.getMonth() + '/' + date.getDay() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
    return {ok: true, data: {playerId: playerId, startTime: startTime}};
}