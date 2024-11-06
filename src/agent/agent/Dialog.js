const EventEmitter = require('events').EventEmitter;
const httpClient = require('../../utils/httpClient');
const Logger = require('../../logging/logger');
const { logToFile, logDir, logFileName } = require('../../../config/agent.json').logger;
const logger = new Logger(__filename, 'Dialog', { logToFile, logDir, logFileName });
/*--------------------------------------------------------------------------------------------
		Dialog
---------------------------------------------------------------------------------------------*/
class Dialog extends EventEmitter {
    constructor(token, hostName, proxy) {
        const caller = 'Dialog';
        super();
        this.statusList = ["pending", "processing", "terminated", "closed"];
        this.statusId = 0;
        this.token = token;
        this.hostName = hostName;
        this.proxy = proxy;
        logger.log(caller, 'DEBUG', 'hostName: ' + this.hostName);
        logger.log(caller, 'INFO2', 'Create dialog for cmd token: ' + this.token);
    }
    sendStatus = async (status, data) => {
        var caller = 'sendStatus';
        var headers = {};
        var sentData = {error: null, hostName: this.hostName, dialog: {token: this.token, status: status}, data: data};
        if(status == 'pending') {
            var method = 'POST';
            var url = '/dialogs';
        } else if(status == 'closed') {
            var method = 'DELETE';
            var url = '/dialogs/' + this.id;
            sentData.dialog.id = this.id;
        } else {
            var method = 'PUT';
            var url = '/dialogs/' + this.id;
            sentData.dialog.id = this.id;
        }
        if(status == 'aborted') {
            var url = '/dialogs/' + this.id;
            sentData.dialog.id = this.id;
            sentData.error = data;
            sentData.data = null;
        }
        const requestData = {method, url: url, host: this.proxy.host, port: this.proxy.port, headers, data:sentData};
        try {
            var result = await httpClient.sendRequest(requestData);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: httpClient.sendRequest failed');
            //Fatal error. Stop dialog process
            this.status = 'error';
            this.emit('error', error);
            logger.error(caller, error);
            return;
        }
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: httpClient.sendRequest result is ko');
            //Do not emit error if aborted otherwise it will loop infinitely
            if(status != 'aborted') {
                logger.log(caller, 'ERROR', 'ERROR: sendRequest failed. Emit error');
                this.emit('error', 'SendRequest failed');
            } else {
                logger.log(caller, 'ERROR', 'ERROR: sendRequest failed. Emit aborted');
                this.emit('aborted', 'SendRequest failed');
            }            
        } else {
            const proxyData = result.data;
            if(!proxyData.ok) {
                logger.log(caller, 'ERROR', 'ERROR: proxy data result is ko.' + proxyData.error.msg);
                this.emit('error', proxyData.error.msg);
            } else {
                if(status == 'pending') {
                    //Store dialog id send by server
                    this.id = proxyData.data.dialogId;
                    logger.log(caller, 'INFO2', 'Dialog id has been returned by proxy: ' + this.id);
                }
                this.emit(status);
            }
        }
    }
    abort(error) {
        var caller = 'abort';
        logger.log(caller, 'ERROR', 'ERROR: Send abort status to Proxy on demand');
        this.sendStatus('aborted', error);
    }
    start() {
        var caller = 'start';
        this.sendStatus(this.statusList[0]);
    }
    next(data) {
        var caller = 'next';
        this.statusId ++;
        if(this.statusList[this.statusId])
            this.sendStatus(this.statusList[this.statusId], data);
        else
            logger.log(caller, 'ERROR', 'ERROR: bad statusId: ' + this.statusId);
    }
}
module.exports = Dialog;