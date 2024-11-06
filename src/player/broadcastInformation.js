const api = require('./api');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'broadcastInformation');

exports.send = async(server, playerId) => {
    const caller = 'send';
    const urlPath = '/' + playerId;
    const headers = {};
    const sentData = 'broadcast=broadcast_in_progress';
    logger.log(caller, 'INFO1', 'Send broadcast information');
    try {
        const result = await api.sendCmdAndParseResult(server.host, server.port, 'putBroadcastInformation', headers, urlPath, sentData);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: api.sendCmdAndParseResult result is ko');
            return {ok: false};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: api.sendCmdAndParseResult failed');
        logger.error(caller, error);
        return {ok: false};
    }
    logger.log(caller, 'INFO2', 'Broadcast information has been sent');
    return {ok: true};
}