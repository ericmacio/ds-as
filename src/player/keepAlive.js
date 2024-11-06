const api = require('./api');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'keepAlive');
const {keepAliveFeedbackList} = require('./keepAlive.json');

exports.send = async(server, type, playerId, startTime, configValues) => {
    const caller = 'send';
    var urlPath = '/' + playerId;
    var headers = {};
    if(type == "message") {
        var feedback = {
            type: type,
            user_type: "player",
            user_id: playerId,
            version: configValues.version,
            feedback_details: {type: "start_time", item: "player", value: startTime}
        }
    } else if(type == "alive") {
        const feedbackDetails = keepAliveFeedbackList.map((feedback) => ({...feedback, value: configValues[feedback.type]}));
        var feedback = {
            "@attributes": {next_message: "300"},
            type: type,
            user_type: "player",
            user_id: playerId,
            version: configValues.version,
            feedback_details: feedbackDetails
        }
    } else {
        logger.log(caller, 'ERROR', 'ERROR: bad feedback type: ' + type);
        return {ok: false};
    }
    logger.log(caller, 'INFO1', 'Send keepAlive [' + type + ']');
    const sentData = "device_type=" + configValues.device_type + "&feedback_type=" + type + "&feedback=" + JSON.stringify(feedback);
    logger.log(caller, 'INFO2', 'Send KeepAlive, type: ' + type);
    logger.log(caller, 'DEBUG', 'Send KeepAlive message: ' + sentData);
    try {
        const result = await api.sendCmdAndParseResult(server.host, server.port, 'putKeepAlive', headers, urlPath, sentData);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: sendCmdAndParseResult result is ko');
            return {ok: false};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: sendCmdAndParseResult failed');
        logger.error(caller, error);
        return {ok: false};
    }
    logger.log(caller, 'DEBUG', 'Keep alive type [' + type + '] has been sent');
    return {ok: true};
}