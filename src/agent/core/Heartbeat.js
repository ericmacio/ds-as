const EventEmitter = require('events').EventEmitter;
const httpClient = require('../../utils/httpClient');
const Logger = require('../../logging/logger');
const { logToFile, logDir, logFileName } = require('../../../config/agent.json').logger;
const logger = new Logger(__filename, 'Heartbeat', { logToFile, logDir, logFileName });
/*--------------------------------------------------------------------------------------------
		Heartbeat
---------------------------------------------------------------------------------------------*/
class Heartbeat extends EventEmitter {
    constructor(hostName, proxy, defaultTimer, version) {
        const caller = 'HeartBeat';
        super();
        this.hostName = hostName;
        this.proxy = proxy;
        this.defaultTimer = defaultTimer;
        this.version = version;
        logger.log(caller, 'DEBUG', 'Created Heartbeat with hostName: ' + this.hostName);
    }
    start = async() => {
        var caller = 'start';
        //Register this hostName to the AS proxy
        var method = 'POST';
        var url = '/heartbeat';
        var headers = {};
        var data = {hostName: this.hostName, timer: this.defaultTimer, version: this.version};
        const requestData = {method, url: url, host: this.proxy.host, port: this.proxy.port, headers, data};
        try {
            var result = await httpClient.sendRequest(requestData);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: httpClient.sendRequest failed');
            //Fatal error. Stop heartbeat process
            this.status = 'error';
            this.emit('error');
            logger.error(caller, error);
            return;
        }
        if(!result.ok) {
            logger.log(caller, 'DEBUG', 'ERROR: httpClient.sendRequest result is ko');
            this.emit('error');
            logger.log(caller, 'ERROR', 'ERROR: Heartbeat process failed');
            this.timeOut = setTimeout(() => {this.start();}, this.defaultTimer * 1000);
        } else {
            const proxyData = result.data;
            if(!proxyData.ok) {
                logger.log(caller, 'ERROR', 'ERROR: proxy data result is ko.' + proxyData.error.msg);
                var nextTimer = this.defaultTimer;
            } else {
                this.emit('ok');
                logger.log(caller, 'DEBUG', 'Proxy data from heartbeat: ' + JSON.stringify(proxyData));
                const {hostName, timer } = proxyData.data;
                logger.log(caller, 'INFO2', 'Host name: ' + hostName + ', timer(sec): ' + timer);
                var nextTimer = (timer) ? timer : this.defaultTimer;
                logger.log(caller, 'INFO2', 'nextTimer: ' + nextTimer);
            }
            this.timeOut = setTimeout(() => {this.start();}, nextTimer * 1000);
        } 
    }
    stop() {
        this.emit('stop');
        clearTimeout(this.timeOut);
        logger.log(caller, 'INFO0', 'Heartbeat process has been stopped');
    }
}
module.exports = Heartbeat;