const EventEmitter = require('events').EventEmitter;
const { networkInterfaces } = require('os');
const httpClient = require('../../utils/httpClient');
const Logger = require('../../logging/logger');
const { logToFile, logDir, logFileName } = require('../../../config/agent.json').logger;
const logger = new Logger(__filename, 'Register', { logToFile, logDir, logFileName });
/*--------------------------------------------------------------------------------------------
		Register
---------------------------------------------------------------------------------------------*/
class Register extends EventEmitter {
    constructor(hostName, proxy, defaultExpires, retryTimer, version) {
        const caller = 'Register';
        super();
        this.hostName = hostName;
        this.remoteHost = proxy.host;
        this.remotePort = proxy.port;
        this.defaultExpires = defaultExpires;
        this.retryTimer = retryTimer;
        this.version = version;
        this.status = 'unregistered';
        this.networkIP = this.getFirstNet();
        logger.log(caller, 'DEBUG', 'networkIP: ' + JSON.stringify(this.networkIP));
        logger.log(caller, 'DEBUG', 'Created Register with hostName: ' + this.hostName);
    }
    getFirstNet = () => {
        const caller = 'getIps';
        const nets = networkInterfaces();
        logger.log(caller, 'DEBUG', 'nets: ' + JSON.stringify(nets));
        const filteredNets = [];
        for (const key in nets) {
            // skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
            const netInfos = nets[key].filter(net => net.address != null && net.family == 'IPv4' && !net.internal);
            if(netInfos.length > 0)
                filteredNets.push(netInfos.map(netInfo => ({...netInfo, name: key})));
        }
        logger.log(caller, 'DEBUG', 'filteredNets: ' + JSON.stringify(filteredNets));
        //Return only first element of first key
        const networkIP = filteredNets[0] && filteredNets[0][0] ? filteredNets[0][0] : 'Unknown';
        return networkIP;
    }
    start = async(update) => {
        const caller = 'register';
        //Register this hostName to the AS proxy
        if(this.timeout)
            clearTimeout(this.timeout);
        const method = update ? 'PUT' : 'POST';
        const url = update ? '/register/' + this.id : '/register';
        const headers = {};
        const data = {hostName: this.hostName, expires: this.defaultExpires, network: this.networkIP, version: this.version};
        const requestData = {method, url: url, host: this.remoteHost, port: this.remotePort, headers, data};
        try {
            var result = await httpClient.sendRequest(requestData);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: httpClient.sendRequest failed');
            //Fatal error. Stop registration process
            this.status = 'error';
            this.emit(this.status);
            this.timeout = setTimeout(() => {this.start(update);}, this.retryTimer * 1000);
        }
        if(result && !result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: Registration process failed');
            //Registration failed. Let's retry after a while
            this.status = 'error';
            this.emit(this.status);
            this.timeout = setTimeout(() => {this.start(update);}, this.retryTimer * 1000);
        } else if(result) {
            //Get proxy data
            const proxyData = result.data;
            if(!proxyData.ok) {
                logger.log(caller, 'ERROR', 'ERROR: proxy data result is ko.' + proxyData.error.msg);
                var nextExpires = this.defaultExpires;
            } else {
                logger.log(caller, 'DEBUG', 'hostData: ' + JSON.stringify(proxyData.data));
                const { id, hostName, expires, time } = proxyData.data;
                logger.log(caller, 'INFO2', 'Name: ' + hostName + ', id: ' + id + ', timer(sec): ' + expires + ', time: ' + time);
                this.id = id;
                var nextExpires = expires ? (expires/2) : this.defaultExpires;
                logger.log(caller, 'INFO2', 'nextExpires: ' + nextExpires);
                this.status = 'registered';
                if(!update) {
                    logger.log(caller, 'INFO0', 'Agent has been successfully registered: ' + hostName);
                    logger.log(caller, 'INFO2', 'HostData id: ' + id + ', expires: ' + expires + ', time: ' + time);
                    this.emit(this.status);
                }
            }
            this.timeout = setTimeout(() => {this.start(true);}, nextExpires * 1000);
        } 
    }
    unregister = async() => {
        const caller = 'unregister';
        //Unregister this hostName to the AS proxy
        if(this.timeout)
            clearTimeout(this.timeout);
        const method = 'PUT';
        const url = '/register/' + this.id;
        const headers = {};
        const data = {hostName: this.hostName, expires: 0, network: this.networkIP};
        const requestData = {method, url: url, host: this.remoteHost, port: this.remotePort, headers, data};
        try {
            var result = await httpClient.sendRequest(requestData);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: httpClient.sendRequest failed');
            //Fatal error. Stop registration process
            this.status = 'error';
            this.emit(this.status);
        }
        if(result && !result.ok)
            logger.log(caller, 'ERROR', 'ERROR: Unregistration process failed');
        else if(result) {
            //Get proxy data
            const proxyData = result.data;
            if(!proxyData.ok)
                logger.log(caller, 'ERROR', 'ERROR: proxy data result is ko.' + proxyData.error.msg);
            else {
                this.status = 'unregistered';
                logger.log(caller, 'INFO0', 'Agent has been succesfully unregistered: ' + this.hostName);
                this.emit(this.status);
            }
        } 
    }
    isRegistered() {
        return (this.status == 'registered');
    }
}
module.exports = Register;