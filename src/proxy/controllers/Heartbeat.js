const EventEmitter = require('events').EventEmitter;
const mongoose = require('mongoose');
const Agent = require('../../repository/models/agent');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'Heartbeat');
const STATUS_OK = 'ok';
const STATUS_KO = 'ko';
/*--------------------------------------------------------------------------------------------
		Heartbeat
---------------------------------------------------------------------------------------------*/
class Heartbeat extends EventEmitter {
    constructor(timer) {
        const caller = 'HeartbeatMgr';
        super();
        this.heartbeatHostList = new Object();
        this.expireTimerList = new Object();
        this.defaultTimer = timer;
        //Connect to local database
        mongoose.connect('mongodb://localhost/ds-as', { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });
    }
    set = async(req, res, next) => {
        const caller = 'set';
        const { hostName, timer, version } = req.body;
        if(!hostName) {
            logger.log(caller, 'ERROR', 'ERROR: hostName is undefined');
            res.set('Content-Type', 'application/json');
            res.status(404).send({ok: false, error: {msg: 'Host heartbeat failed: hostName is missing'}});
        } else {
            logger.log(caller, 'INFO2', 'Heartbeat received for hostName: ' + hostName +'. Timer: ' + timer + ' sec, version: ' + version);
            this.heartbeatHostList[hostName] = {
                status: STATUS_OK,
                time: new Date().getTime()
            }
            this.emit('heartbeat', { hostName, coreVersion: version, lastHeartbeatTime: this.heartbeatHostList[hostName].time });
            clearTimeout(this.expireTimerList[hostName]);
            this.expireTimerList[hostName] = setTimeout(() => {this.timeOut(hostName);}, this.defaultTimer * 1000);
            //Update the existing agent with heartbeat values
            try {
                await Agent.updateOne({hostName: hostName}, {lastHeartbeatTime: this.heartbeatHostList[hostName].time, coreVersion: version});
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: Agent.updateOne failed');
                logger.error(caller, error);
                res.status(500).send({ok: false, error: {msg: 'Cannot update agent. Error: ' + error}});
                return;
            }
            res.set('Content-Type', 'application/json');
            res.status(200).send({ok: true, data: {hostName: hostName, timer: Math.min(req.body.timer, this.defaultTimer)}});
        }
    }
    timeOut(hostName) {
        const caller = 'timeOut';
        logger.log(caller, 'WARNING', 'WARNING: Heartbeat timer exceeded for host: ' + hostName);
        this.heartbeatHostList[hostName].status = STATUS_KO;
        this.emit('timeOut', { hostName });
    }
    isOk(hostName) {
        const caller = 'isOk';
        return (this.heartbeatHostList[hostName].status == STATUS_OK);
        
    }
}
module.exports = Heartbeat;