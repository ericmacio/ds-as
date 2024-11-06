const EventEmitter = require('events').EventEmitter;
const mongoose = require('mongoose');
const Agent = require('../../repository/models/agent');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'Registrar');

class Registrar extends EventEmitter {
	constructor(expires) {
        const caller = 'Registrar';
        super();
        this.registeredHostList = new Object();
        this.expireTimerList = new Object();
        this.defaultExpiresSec = expires;
        //Connect to local database
        mongoose.connect('mongodb://localhost/ds-as', { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });
	}
	register = async(req, res, next) => {
		const caller = 'register';
        const { hostName, expires, network, version } = req.body;
        if(this.isRegistered(hostName)) {
            logger.log(caller, 'WARNING', 'WARNING: Host was already registered: ' + hostName);
            this.updateRegistration(req, res, next);
        } else {
            const date = new Date();
            var hostData = {
                id: Object.keys(this.registeredHostList).length,
                hostName: hostName,
                time: date.getTime(),
                lastTime: date.getTime(),
                expires: this.defaultExpiresSec,
                network: network,
                version: version
            }
            this.expireTimerList[hostName] = setTimeout(() => {
                logger.log(caller, 'WARNING', 'WARNING: Registration timer exceeded for host: ' + hostName);
                this.unRegister(hostName);
            }, this.defaultExpiresSec * 1000);
            this.registeredHostList[hostName] = hostData;
            //Update the existing agent with registration values
            try {
                await Agent.updateOne({hostName: hostName}, {registrationTime: hostData.time, lastRegistrationTime: hostData.time, expires: hostData.expires, network: JSON.stringify(hostData.network), agentVersion: hostData.version});
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: Agent.updateOne failed');
                logger.error(caller, error);
                res.status(500).send({ok: false, error: {msg: 'Cannot update agent. Error: ' + error}});
                return;
            }
            logger.log(caller, 'INFO0', 'Host has been registered: ' + hostName + ', version: ' + version);
			res.set('Content-Type', 'application/json');
			res.status(200).send({ok: true, data: hostData});
			this.emit('registered', { hostName, version, registrationTime: hostData.time, lastRegistrationTime: hostData.time });
		}
    }
    unRegister = (hostName) => {
        const caller = 'unRegister';
        clearTimeout(this.expireTimerList[hostName]);
        delete this.registeredHostList[hostName];
		logger.log(caller, 'WARNING', 'WARNING: Host has been unregistered: ' + hostName);
		this.emit('unregistered', { hostName });
    }
    updateRegistration = async(req, res, next) => {
		const caller = 'updateRegistration';
		const id = req.params['id'];
		const { hostName, expires, network, version } = req.body;
        if(expires == 0) {
            logger.log(caller, 'WARNING', 'WARNING: Receive registration with expires = 0. Unregister it');
            clearTimeout(this.expireTimerList[hostName]);
            delete this.registeredHostList[hostName];
            this.emit('unregistered', { hostName });
            res.status(200).send({ok: true});
        } else {
            logger.log(caller, 'INFO2', 'Update registration for host: ' + hostName);
            //Update hostName registration information
            var hostData = this.registeredHostList[hostName];
            if(hostData) {
                if(id && id != hostData.id)
                    logger.log(caller, 'WARNING', 'WARNING: id mismatch. Received: ' + id + ', expected: ' + id);
                hostData.lastTime = new Date().getTime();
                hostData.network = network;
                hostData.version = version;
                clearTimeout(this.expireTimerList[hostName]);
                //Update the existing agent with registration values
                try {
                    await Agent.updateOne({hostName: hostName}, {lastRegistrationTime: hostData.lastTime, network: JSON.stringify(hostData.network), agentVersion: version});
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: Agent.updateOne failed');
                    logger.error(caller, error);
                    res.status(500).send({ok: false, error: {msg: 'Cannot update agent. Error: ' + error}});
                    return;
                }
                this.expireTimerList[hostName] = setTimeout(() => {
                    logger.log(caller, 'WARNING', 'WARNING: Registration timer exceeded for host: ' + hostName);
                    this.unRegister(hostName);
                }, this.defaultExpiresSec * 1000);
                res.set('Content-Type', 'application/json');
                res.status(200).send({ok: true, data: hostData});
                this.emit('registered', { hostName, version, registrationTime: hostData.time, lastRegistrationTime: hostData.lastTime });
            } else {
                logger.log(caller, 'WARNING', 'WARNING: Host is not registered: ' + hostName);
                logger.log(caller, 'WARNING', 'We must register it');
                this.register(req, res, next);
            }
        }
    }
    isRegistered = (hostName) => {
        var registered = false;
        for(var key in this.registeredHostList)
            if(this.registeredHostList[key].hostName == hostName) {
                registered = true;
                break;
            }
        return registered;
    }
}
module.exports = Registrar;
