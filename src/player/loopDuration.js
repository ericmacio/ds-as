const api = require('./api');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'loopDuration');

exports.send = async(server, playerId) => {
    const caller = 'start';
    const urlPath = '/' + playerId;
    const headers = {};
    const sentData = 'duration=88375';
    logger.log(caller, 'INFO1', 'Send loop duration information');
    try {
        const result = await api.sendCmdAndParseResult(server.host, server.port, 'postWinDevicesLoopDuration', headers, urlPath, sentData);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: api.sendCmdAndParseResult result is ko');
            return {ok: false};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: api.sendCmdAndParseResult failed');
        logger.error(caller, error);
        return {ok: false};
    }
    logger.log(caller, 'INFO2', 'Loop duration information has been sent');
    return {ok: true};
}