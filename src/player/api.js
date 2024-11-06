const httpClient = require('../utils/httpClient');
const parseXml = require('../utils/parseXml');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'api');
const apiCmd = require('./Api.json').cmdList;
const SERVER_RESPONSE_OK = 'ok';

exports.sendCmd = async(host, port, cmdName, headers, urlPath, sentData) => {
    var caller = 'sendCmd';
    const cmd = apiCmd[cmdName];
    if(cmd) {
        var cmdUrl = cmd.url;
        if(urlPath)
            cmdUrl += urlPath;
        logger.log(caller, 'DEBUG', 'cmd.url: ' + cmdUrl);
        logger.log(caller, 'DEBUG', 'cmd.request: ' + cmd.request);
        if(cmd.contentType)
            headers['Content-Type'] = cmd.contentType;
        if(sentData) {
            logger.log(caller, 'DEBUG', 'There is sentData');
            if(cmd.contentType.indexOf('json') >= 0) {
                logger.log(caller, 'DEBUG', 'Stringify JSON data before sending');
                sentData = JSON.stringify(sentData);
            }
            const sentDataLength = Buffer.byteLength(sentData, 'utf8');
            logger.log(caller, 'DEBUG', 'SentData length: ' + sentDataLength);
            headers['Content-Length'] = sentDataLength;
        }
        const requestData = {
            url: cmdUrl,
            method: cmd.request,
            data: sentData,
            headers: headers,
            host: host,
            port: port
        }
        logger.log(caller, 'DEBUG', 'Call httpClient.sendRequest');
        try {
            var result = await httpClient.sendRequest(requestData);
            if(!result.ok)
                logger.log(caller, 'INFO2', 'ERROR: httpClient.sendRequest result is ko');
            else if(result.data == '') 
                logger.log(caller, 'DEBUG', 'No data received from server');
            return(result);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: httpClient.sendRequest failed');
            logger.error(caller, error);
            return {ok: false};
        }
    } else {
        logger.log(caller, 'ERROR', 'ERROR: cmd is undefined');
        throw new Error('Command is missing');
    }
}
exports.sendCmdAndParseResult = async(host, port, cmdName, headers, urlPath, sentData) => {
    var caller = 'sendCmdAndParseResult';
    try {
        let result = await exports.sendCmd(host, port, cmdName, headers, urlPath, sentData);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: SendCmd result is ko');
            return {ok: false};
        }
        var serverData = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: SendCmd failed');
        logger.error(caller, error);
        return {ok: false};
    }
    logger.log(caller, 'INFO2', 'serverData: ' + JSON.stringify(serverData));
    if(!serverData.xml_return) {
        logger.log(caller, 'WARNING', 'WARNING: No XML data from server data');
        return {ok: true};
    }
    var xml = serverData.xml_return.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
    logger.log(caller, 'INFO2', 'xml: ' + xml);
    try {
        const parseResult = await parseXml.parse(xml);
        logger.log(caller, 'DEBUG', 'XML return: ' + JSON.stringify(parseResult));
        var status = parseResult['server_response']['$']['status'];
        if(status != SERVER_RESPONSE_OK) {
            logger.log(caller, 'ERROR', 'ERROR: Send cmd [' + cmdName + '] server status is KO. Status: ' + status);
            logger.log(caller, 'ERROR', 'ERROR: XML parse result: ' + JSON.stringify(parseResult));
            return {ok: false};
        }
        return {ok: true, data: parseResult};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: parseXml failed');
        logger.error(caller, error);
        return {ok: false};
    }
}
exports.executeCmd = async(host, port, cmdName, urlPath, sentData) => {
    const caller = 'executeCmd';
    logger.log(caller, 'INFO1', 'Send cmd: ' + cmdName);
    var headers = {};
    try {
        let result = await exports.sendCmd(host, port, cmdName, headers, urlPath, sentData);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: SendCmd result is ko');
            return {ok: false};
        }
        var serverData = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: SendCmd failed');
        logger.error(caller, error);
        return {ok: false};
    }
    if(!serverData) {
        logger.log(caller, 'WARNING', 'WARNING: ' + cmdName + ' returned no data');
        return {ok: true};
    } else {   
        logger.log(caller, 'INFO2', cmdName + ' returned: ' + serverData);
        if(cmdName == 'getQuickMessage') {
            if(!serverData.qm) {
                logger.log(caller, 'WARNING', 'WARNING: No QM data from server data');
                return {ok: true};
            }
            var xml = serverData.qm.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
        } else {
            if(!serverData.xml_return) {
                logger.log(caller, 'WARNING', 'WARNING: No XML data from server data');
                return {ok: true};
            }
            var xml = serverData.xml_return.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
        }
        try {
            var parseResult = await parseXml.parse(xml);
            logger.log(caller, 'INFO2', 'XML return: ' + JSON.stringify(parseResult));
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: parseXml failed');
            logger.error(caller, error);
            return {ok: false};
        }
        if(cmdName != 'getQuickMessage') {
            const serverStatus = parseResult['server_response']['$']['status'];
            logger.log(caller, 'DEBUG',  cmdName + ' status: ' + serverStatus);
            if(serverStatus != SERVER_RESPONSE_OK) {
                logger.log(caller, 'WARNING', 'WARNING: quickMessage server status is KO for cmd: ' + cmdName + '. Status: ' + serverStatus);
                logger.log(caller, 'WARNING', 'WARNING: XML return: ' + JSON.stringify(parseResult));
            }
        }
        return {ok: true, data: parseResult};
    }
}