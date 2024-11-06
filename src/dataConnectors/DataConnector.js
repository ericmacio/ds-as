
var util = require('util');
const GoogleApi = require('./googleApi/googleApi');
var Logger = require('../logging/logger');
var logger = new Logger(__filename, 'DataConnector');
/*--------------------------------------------------------------------------------------------
		DataConnector
---------------------------------------------------------------------------------------------*/
class DataConnector {
    constructor(serviceName, key, config, proxy) {
        const caller = 'DataConnector';
        this.serviceName = serviceName;
        this.key = key;
        this.config = config;
        this.proxy = proxy;
        this.googleApi;
        logger.log(caller, 'INFO0', 'New DataConnector. Service: ' + this.serviceName + ', key: ' + this.key + ', Type: ' + this.config.type + ', access: ' + this.config.access.type);
    }
    connect = async() => {
        const caller = 'connect';
        switch(this.config.access.type) {
            case 'remote':
                logger.log(caller, 'INFO2', 'Connect Proxy to remote agent');
                if(typeof(this.proxy) == 'undefined') {
                    logger.log(caller, 'ERROR', 'ERROR: proxy is undefined');
                    throw new Error('Proxy undefined. Cannot connect it');
                }
                //Connect this dataconnector to the proxy
                //In this step the proxy will create remote dataConnector agent and link both together
                try {
                    const result = await this.proxy.connect(this.serviceName, this.key, this.config);
                    if(!result.ok)
                        logger.log(caller, 'ERROR', 'ERROR: proxy.connect result is ko');
                    else {
                        this.proxyId = result.data.proxyId;
                        this.asAgentId = result.data.asAgentId;
                        logger.log(caller, 'INFO0', 'Proxy connected to remote agent, proxyId: ' + this.proxyId + ', asAgentId: ' + this.asAgentId);
                    }
                    return result;
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: proxy.connect failed');
                    logger.error(caller, error);
                    return{ok: false};
                }
                break;
            case 'local':
                return {ok: true};
                break;
            case 'googleApi':
                logger.log(caller, 'INFO2', 'Connect to Google API');
                this.googleApi = new GoogleApi();
                try {
                    let result = await this.googleApi.connect();
                    logger.log(caller, 'DEBUG', 'Result: ' + JSON.stringify(result)); 
                    if(!result.ok)
                        logger.log(caller, 'DEBUG', 'ERROR: googleApi.connect result is ko');
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: googleApi.connect failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                //Get fileId
                try {
                    let result = await this.googleApi.getDriveFileId(this.config.params.file);
                    if(!result.ok) {
                        logger.log(caller, 'DEBUG', 'ERROR: googleApi.getDriveFileExist result is ko');
                        return {ok: false};
                    }
                    this.googleApiFileId = result.data;
                    logger.log(caller, 'INFO2', 'googleApiFileId: ' + this.googleApiFileId);
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: googleApi.getDriveFileExist failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                return {ok: true};
                break;
            default:
                logger.log(caller, 'ERROR', 'ERROR: Bad access type: ' + this.config.access.type);
                return {ok: false};
                break;
        }
    }
    close = async() => {
        const caller = 'close';
        switch(this.config.access.type) {
            case 'remote':
                if(typeof(this.proxy) == 'undefined') {
                    logger.log(caller, 'ERROR', 'ERROR: proxy is undefined');
                    throw new Error('Proxy undefined. Cannot connect to it');
                }
                //Disconnect this dataconnector from the proxy
                //In this step the proxy will create remote dataConnector agent and link both together
                try {
                    let result = await this.proxy.close(this.serviceName, this.key, this.config, this.proxyId, this.asAgentId);
                    if(!result.ok)
                        logger.log(caller, 'DEBUG', 'ERROR: proxy.close result is ko');
                    else
                        logger.log(caller, 'INFO0', 'Disconnected from proxy, proxyId: ' + this.proxyId + ', asAgentId: ' + this.asAgentId);
                    return result;
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: proxy.close failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                break;
            case 'local':
                return {ok: true};
                break;
            case 'googleApi':
                logger.log(caller, 'INFO2', 'Access is Google API');
                return {ok: true};
                break;
            default:
                logger.log(caller, 'ERROR', 'ERROR: Bad access type: ' + this.config.access.type);
                return {ok: false};
                break;
        }
    }
    async proxyCmd(value, data) {
        const caller = 'proxyCmd';
        //Check dataConnector has well been connected to the proxy. Ids must exist
        if((typeof(this.proxyId) == 'undefined') || (typeof(this.asAgentId) == 'undefined')) {
            logger.log(caller, 'ERROR', 'ERROR: Not connected to proxy yet. Cannot create cmd');
            throw new Error('Agent dataConnector has not been created yet');
        }
        //Pass the cmd to the proxy so that it can be send to the remote agent
        var cmd = {
            serviceName: this.serviceName,
            key: this.key,
            hostName: this.config.access.hostName,
            asAgentId: this.asAgentId,
            proxyId: this.proxyId,
            type: 'dataConnector_cmd',
            value: value,
            data: data
        }
        logger.log(caller, 'INFO2', 'Send cmd to proxy. Type: ' + cmd.type + ', value: ' + cmd.value);
        try {
            let result = await this.proxy.sendCmd(cmd);
            if(!result.ok)
                logger.log(caller, 'DEBUG', 'ERROR: proxy.sendCmd result is ko');
            else {
                logger.log(caller, 'DEBUG', 'proxy response for asAgent_cmd ' + cmd.value + ': ' + JSON.stringify(data));
                logger.log(caller, 'INFO2', 'Request terminated. Service: ' + cmd.serviceName + ', key: ' + cmd.key + ', cmd: ' + cmd.value);
            }
            return result;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: proxy.sendCmd failed');
            logger.error(caller, error);
            return {ok: false};
        }
    }
    googleApiCmd = async(value, data) => {
        const caller = 'googleApiCmd';
        //Check google Api instance already exists
        if((typeof(this.googleApi) == 'undefined')) {
            logger.log(caller, 'ERROR', 'ERROR: googleApi is undefined');
            throw new Error('Not connected to Google API yet. Cannot create cmd');
        }
        switch(value) {
            case 'readXls':
                try {
                    let result = await this.googleApi.getSheetValues(this.googleApiFileId, this.config.params.cellRange, this.config.params.majorDimension);
                    if(!result.ok) {
                        logger.log(caller, 'DEBUG', 'ERROR: googleApi.getSheetValues result is ko');
                        return result;
                    }
                    var rows = result.data.data.values;
                    //We must format data before sending them back
                    //Get table headers
                    var rows0 = rows[0];
                    var data = [];
                    for(var rowId=1; rowId<rows.length; rowId++) {
                        const row = rows[rowId];
                        data[rowId-1] = new Object();
                        for(var colId=0; colId<row.length; colId++)
                            data[rowId-1][rows0[colId]] = row[colId];
                    }
                    logger.log(caller, 'INFO2', 'getSheetValues: ' + JSON.stringify(data));
                    return {ok: true, data: data};
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: googleApi.getSheetValues failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                break;
            case 'fileTime':
                try {
                    let result = await this.googleApi.getDriveFileModifiedTimeById(this.googleApiFileId);
                    if(!result.ok) {
                        logger.log(caller, 'DEBUG', 'ERROR: googleApi.getDriveFileModifiedTimeById result is ko');
                        return result;
                    }
                    logger.log(caller, 'DEBUG', 'ModifiedTime: ' + result.data);
                    var fileDate = new Date(result.data);
                    var time = fileDate.getTime();
                    return {ok: true, data: time};
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: googleApi.getDriveFileModifiedTimeById failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                break;
            case 'access':
                try {
                    let result = await this.googleApi.getDriveFileExist(data.name);
                    if(!result.ok)
                        logger.log(caller, 'DEBUG', 'ERROR: googleApi.getDriveFileExist result is ko');
                    logger.log(caller, 'INFO2', 'Exist: ' + JSON.stringify(result.data));
                    return result;
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: googleApi.getDriveFileExist failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                break;
            default:
                logger.log(caller, 'ERROR', 'ERROR: Bad cmd value: ' + value);
                return {ok: false};
                break;
        }
    }
}
module.exports = DataConnector;