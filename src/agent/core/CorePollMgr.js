const EventEmitter = require('events').EventEmitter;
const httpClient = require('../../utils/httpClient');
const Logger = require('../../logging/logger');
const { logToFile, logDir, logFileName } = require('../../../config/agent.json').logger;
const logger = new Logger(__filename, 'CorePollMgr', { logToFile, logDir, logFileName });
/*--------------------------------------------------------------------------------------------
		CorePollMgr
---------------------------------------------------------------------------------------------*/
class CorePollMgr extends EventEmitter {
    constructor(hostName, proxy, config) {
        var caller = 'CorePollMgr';
        super();
        this.hostName = hostName;
        this.proxy = proxy;
        this.config = config;
        this.currPollTimerMsec = config.defaultPollTimerMsec;
        this.agentProcess;
        this.agentProcessIsRunning = false;
    }
    //Used to reset timer when recovering from error situation
    resetTimer() {
        var caller = 'resetTimer';
        clearTimeout(this.timeout);
        this.currPollTimerMsec = this.config.defaultPollTimerMsec;
    }
    //Repeatedly poll the AS proxy for available core cmd
    restart() {
        var caller = 'restart';
        logger.log(caller, 'INFO2', 'Restart polling');
        this.timeout = setTimeout(() => {this.start();}, this.currPollTimerMsec);
    }
    //Start the polling process for core cmd
    start = async() => {
        var caller = 'start';
        //Set URL value
        var url = '/coreCmds?hostName=' + this.hostName + '&timer=' + this.currPollTimerMsec;
        var headers = {};
        logger.log(caller, 'INFO2', 'Sending core Poll request');
        //Send the request to the proxy and get back the list of cmds to be executed
        const requestData = {method: 'GET', url: url, host: this.proxy.host, port: this.proxy.port, headers};
        try {
            var result = await httpClient.sendRequest(requestData);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: httpClient.sendRequest failed');
            //Fata error. Stop polling process
            this.emit('error');
            logger.error(caller, error);
            return;
        }
        if(!result.ok) {
            logger.log(caller, 'DEBUG', 'ERROR: httpClient.sendRequest result is ko');
            let currPollTimerMsec = this.currPollTimerMsec;
            this.currPollTimerMsec = Math.min(this.currPollTimerMsec*2, this.config.maxPollTimerMsec);
            if(this.currPollTimerMsec != currPollTimerMsec)
                logger.log(caller, 'WARNING', 'WARNING: New core poll timer: ' + this.currPollTimerMsec);
            else
                logger.log(caller, 'WARNING', 'WARNING: Core poll timer: ' + this.currPollTimerMsec);
            this.emit('error');
            this.restart();
        } else {
            const proxyData = result.data;
            if(!proxyData.ok || !proxyData.data) {
                logger.log(caller, 'ERROR', 'ERROR: proxy data result is ko.' + proxyData.error.msg);
                this.restart();
            } else {
                //Get the cmd returned by the AS proxy
                var cmd = proxyData.data.cmd;
                //Get the timer for polling recommended by the AS
                this.currPollTimerMsec = proxyData.data.timer;
                //Check cmd exists
                if(cmd) {
                    //Set poll timer to the min value
                    this.currPollTimerMsec = this.config.minPollTimerMsec;
                    //Send signal to execute the cmd. the polling will be restarted once cmd has been executed
                    this.emit('executeCmd', cmd);
                } else {
                    //No cmd to be executed
                    logger.log(caller, 'DEBUG', 'No cmd received');
                    this.currPollTimerMsec = Math.min(this.currPollTimerMsec*2, this.config.defaultPollTimerMsec);
                    this.restart();
                }
            }
        }
    }
}
module.exports = CorePollMgr;
