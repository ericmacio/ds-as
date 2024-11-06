const api = require('./api');
const handleQM = require('./handleQM');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'quickMessage');

exports.send = async(server, playerId, configValues, mediaLibrary, setBroadcastContent, storeQM) => {
    const caller = 'send';
    logger.log(caller, 'DEBUG', 'playerId: ' + playerId);
    var urlPath = '/' + playerId.replace(/:/g, '_');
    const result = await api.executeCmd(server.host, server.port, 'getQuickMessage', urlPath, null);
    if(!result.ok) {
        logger.log(caller, 'ERROR', 'ERROR: api.executeCmd result is ko');
        return {ok: false};
    }
    logger.log(caller, 'INFO2', 'QM has been sent');
    var qmResult = result.data;
    logger.log(caller, 'INFO2', 'QM: ' + JSON.stringify(qmResult));
    if(qmResult && qmResult['quick_message']['task']) {
        var qmTask = qmResult['quick_message']['task'][0];
        var qmType = qmTask['$']['type'];
        var qmName = qmTask['$']['name'];
        var qmId = qmTask['$']['id'];
        logger.log(caller, 'INFO0', '---> QM, Id: ' + qmId + ', type: ' + qmType + ', name: ' + qmName);
        var qmData = {type: qmType, name: qmName, id: qmId};
        //Store QM data thanks to callback function
        try {
            const result = await storeQM(qmData);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: storeQM result is ko');
                return {ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: storeQM failed');
            logger.error(caller, error);
            return {ok: false};
        }
        try {
            const result = await handleQM.execute(server, playerId, qmTask, configValues, mediaLibrary);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: qm.handleQm result is ko');
                logger.log(caller, 'ERROR', 'ERROR. QM processing aborted: ' + qmName);
                return {ok: false};
            }
            var qmResult = result.data;
            if(qmResult && qmResult.folders) {
                //Update broadcast content with QM result if any
                try {
                    const result = await setBroadcastContent(qmResult.folders);
                    if(!result.ok) {
                        logger.log(caller, 'INFO2', 'ERROR: setBroadcastContent result is ko');
                        return {ok: false};
                    }
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: setBroadcastContent failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: qm.handleQm failed');
            logger.error(caller, error);
            return {ok: false};
        }
        if(!qmResult)
            logger.log(caller, 'WARNING', 'WARNING: No data available from qm ' + qmName + ' processing');
        else
            qmData = {...qmData, ...qmResult};
        logger.log(caller, 'INFO0', 'End of QM processing: ' + qmName);
    }
    //Return OK status back
    return {ok: true};
}