const EventEmitter = require('events').EventEmitter;
const Dialog = require('./Dialog');
const httpClient = require('../../utils/httpClient');
const Logger = require('../../logging/logger');
const { logToFile, logDir, logFileName } = require('../../../config/agent.json').logger;
const logger = new Logger(__filename, 'PollMgr', { logToFile, logDir, logFileName });
/*--------------------------------------------------------------------------------------------
		PollMgr
---------------------------------------------------------------------------------------------*/
class PollMgr extends EventEmitter {
    constructor(hostName, proxy, config) {
        var caller = 'PollMgr';
        super();
        this.hostName = hostName;
        this.proxy = proxy;
        this.config = config;
        this.currPollTimerMsec = config.defaultPollTimerMsec;
        this.dialogList = new Object();
    }
    resetTimer() {
        var caller = 'setTimer';
        clearTimeout(this.timeout);
        this.currPollTimerMsec = this.config.defaultPollTimerMsec;
    }
    //Repeatedly poll the AS proxy for available cmd
    restart() {
        var caller = 'restart';
        this.timeout = setTimeout(() => {this.start();}, this.currPollTimerMsec);
    }
    start = async() => {
        var caller = 'start';
        //Get current dialog list length
        var dialogListLength = Object.keys(this.dialogList).length;
        logger.log(caller, 'INFO2', 'Nb dialogs: ' + dialogListLength);
        if(dialogListLength == this.config.maxCmds)
            logger.log(caller, 'WARNING', 'WARNING: Max dialogs number have been reached');
        //Set URL value
        var url = '/cmds?hostName=' + this.hostName + '&max=' + (this.config.maxCmds - dialogListLength) + '&timer=' + this.currPollTimerMsec;
        var headers = {};
        logger.log(caller, 'INFO2', 'Poll request sent');
        //Send the request to the proxy and get back the list of cmds to be executed
        const requestData = {method: 'GET', url: url, host: this.proxy.host, port: this.proxy.port, headers};
        try {
            var result = await httpClient.sendRequest(requestData);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: httpClient.sendRequest failed');
            //Fatal error. Stop polling process
            this.emit('error');
            logger.error(caller, error);
            return;
        }
        if(!result.ok) {
            logger.log(caller, 'DEBUG', 'ERROR: httpClient.sendRequest result is ko');
            let currPollTimerMsec = this.currPollTimerMsec;
            this.currPollTimerMsec = Math.min(this.currPollTimerMsec*2, this.config.maxPollTimerMsec);
            if(this.currPollTimerMsec != currPollTimerMsec)
                logger.log(caller, 'WARNING', 'WARNING: New poll timer: ' + this.currPollTimerMsec);
            else
                logger.log(caller, 'WARNING', 'WARNING: Poll timer: ' + this.currPollTimerMsec);
            this.emit('error');
            this.restart();
        } else {
            const proxyData = result.data;
            if(!proxyData.ok || !proxyData.data) {
                logger.log(caller, 'ERROR', 'ERROR: proxy data result is ko.' + proxyData.error.msg);
                this.restart();
            } else {
                //Get the list of cmd returned by the AS proxy
                var cmdList = proxyData.data.cmdList;
                //Get the timer for polling recommending by the proxy
                this.currPollTimerMsec = proxyData.data.timer;
                //Check cmdList exists
                if(cmdList) {
                    logger.log(caller, 'DEBUG', 'cmd length: ' + cmdList.length);
                    if(cmdList.length == 0)
                        this.currPollTimerMsec = Math.min(this.currPollTimerMsec*2, this.config.defaultPollTimerMsec);
                    else
                        this.currPollTimerMsec = this.config.minPollTimerMsec;
                    cmdList.forEach((cmd) => {
                        logger.log(caller, 'INFO2', 'Cmd: ' + JSON.stringify(cmd));
                        //Create new dialog for this cmd
                        var dialog = new Dialog(cmd.token, this.hostName, this.proxy);
                        if(this.dialogList[cmd.token]) {
                            logger.log(caller, 'ERROR', 'ERROR: Dialog already exist for that token: ' + cmd.token);
                            //We can not abort the dialog as it already exist for another cmd. Should send an error to proxy instead .....
                        } else {
                            //Add dialog to the current list
                            this.dialogList[cmd.token] = dialog;
                            logger.log(caller, 'INFO2', 'dialogList length: ' + Object.keys(this.dialogList).length);
                            //Start the dialog
                            dialog.start();
                            //on pending event
                            dialog.on('pending', () => {
                                //We have to check the cmd is valid before processing it
                                logger.log(caller, 'INFO2', 'pending');
                                this.emit('checkCmd', cmd);
                            });
                            //on processing event
                            dialog.on('processing', () => {
                                logger.log(caller, 'INFO2', 'processing');
                                //We can process cmd
                                this.emit('executeCmd', cmd);
                            });
                            //on terminated event
                            dialog.on('terminated', () => {
                                //cmd has been executed properly
                                logger.log(caller, 'INFO0', cmd.type + ' --> ' + cmd.value + ' terminated. Service: ' + cmd.serviceName + ', key: ' + cmd.key);
                                dialog.next();
                            });
                            //on closed event
                            dialog.on('closed', () => {
                                //End of the dialog
                                logger.log(caller, 'INFO2', 'closed');
                                delete this.dialogList[dialog.token];
                            });
                            //on error event
                            dialog.on('error', (error) => {
                                //An error occured during dialog
                                logger.log(caller, 'ERROR', 'ERROR: Dialog emitted error on cmd ' + cmd.value);
                                dialog.abort({msg: 'Dialog aborted on error: ' + error.msg + ', cmd ' + cmd.value});
                            });
                            //on aborted event
                            dialog.on('aborted', (error) => {
                                //Dialog has been aborted
                                logger.log(caller, 'ERROR', 'ERROR: Aborted cmd: ' + cmd.value);
                                delete this.dialogList[dialog.token];
                            });
                        }
                    });
                    //We have started all dialogs so we can restart the polling
                    this.restart();
                } else {
                    logger.log(caller, 'WARNING', 'WARNING: Received an empty cmdList');
                    this.restart();
                }
            }
        }
    }
    continue(error, cmd, data) {
        var caller = 'continue';
        if(error)
            this.dialogList[cmd.token].abort(error)
        else
            this.dialogList[cmd.token].next(data);
    }
}
module.exports = PollMgr;
