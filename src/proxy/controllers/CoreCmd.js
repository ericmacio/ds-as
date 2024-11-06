const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'coreCmdController');

class CoreCmd {
    constructor({ heartbeatCtrl }) {
        const caller = 'CoreCmd';
        this.requestList = new Object();
        //For core agent only
        if(heartbeatCtrl) {
            this.heartbeatCtrl = heartbeatCtrl;
            this.heartbeatCtrl.on('heartbeat', ({ hostName }) => {
                //Create empty list if not exist
                if(!(hostName in this.requestList))
                    this.requestList[hostName] = [];
            });
            this.heartbeatCtrl.on('timeOut', ({ hostName }) => {
                //Empty list when host just timeout
                this.requestList[hostName] = [];
            });
        }
    }
    addRequest = ({ hostName, cmd, onRequestUpdate }) => {
        const caller = 'addRequest';
        logger.log(caller, 'INFO0', 'Add core request for hostName: ' + hostName + '. Request id: ' + cmd.id);
        //Add a new request containing this cmd to the current list
        if(!(hostName in this.requestList))
            this.requestList[hostName] = [];
        this.requestList[hostName].push({cmd, status: 'new', onRequestUpdate});
        logger.log(caller, 'DEBUG', 'Request list length: ' + this.requestList[hostName].length);
    }
    getCoreCmd = async (req, res, next) => {
        const caller = 'getCoreCmd';
        logger.log(caller, 'INFO2', '(get /coreCmds): Received ' + req.method + ' ' + req.path);
        //Query for new cmds by the AS agent core
        var hostName = req.query.hostName;
        var agentPollTimer = req.query.timer;
        logger.log(caller, 'INFO2', 'Host name: ' + hostName + ', timer: ' + agentPollTimer);
        if(!hostName) {
            logger.log(caller, 'ERROR', 'ERROR: hostName is undefined');
            res.set('Content-Type', 'application/json');
            res.status(501).send({ok: false, error: {msg: 'Host name is missing in request parameters'}});
        } else if(!this.requestList[hostName]) {
            logger.log(caller, 'ERROR', 'ERROR: requestList is undefined for host: ' + hostName);
            res.set('Content-Type', 'application/json');
            res.status(500).send({ok: false, error: {msg: 'RequestList is undefined for host: ' + hostName}});
        } else {
            if(this.heartbeatCtrl && !this.heartbeatCtrl.isOk(hostName)) { //Check hostName heartbeat
                logger.log(caller, 'ERROR', 'ERROR: Host not connected: ' + hostName);
                res.set('Content-Type', 'application/json');
                res.status(404).send({ok: false, error: {msg: 'Host is not connected: ' + hostName}});
            } else {
                var nbNew = 0;
                var nbProcessing = 0;
                var nbTerminated = 0;
                for(var id=0; id<this.requestList[hostName].length; id++) {
                    if(this.requestList[hostName][id].status == 'new')
                        nbNew ++;
                    else if(this.requestList[hostName][id].status == 'processing')
                        nbProcessing ++;
                    else if(this.requestList[hostName][id].status == 'terminated')
                        nbTerminated ++;
                    else
                        logger.log(caller, 'WARNING', 'Cmd status: ' + this.requestList[hostName][id].status + ', id: ' + id);
                }
                logger.log(caller, 'INFO0', 'Nb of core cmds [' + hostName + ']: ' + nbNew + '/' + nbProcessing + '/' + nbTerminated);
                var id = 0;
                var found = false;
                //Create the request to be sent back to the AS agent.
                while((id < this.requestList[hostName].length) && !found) {  
                    //Check request is for this hostName and status is new
                    if(this.requestList[hostName][id].status == 'new') {
                        //Set the request to be sent
                        logger.log(caller, 'INFO2', 'Put cmd of request id ' + id + ' as the next request');
                        var sentCmd = this.requestList[hostName][id].cmd;
                        //Request status is now waiting (sent to the AS agent for processing)
                        this.requestList[hostName][id].status = 'processing';
                        found = true;
                    }
                    id++;
                }
                if(nbNew > 1)
                    logger.log(caller, 'WARNING', 'WARNING: Remaining new cmds ...');
                var resp = {
                    cmd: sentCmd,
                    //Do not change timer used by client for polling
                    timer: agentPollTimer
                }
                res.set('Content-Type', 'application/json');
                res.status(200).send({ok: true, data: resp});
            }
        }
    }
    putCoreCmd = async (req, res, next) => {
        const caller = 'putCoreCmd';
        //Query for update of cmd by agent core
        logger.log(caller, 'INFO2', '(put /coreCmds): Received ' + req.method + ' ' + req.path);
        //Get cmd id
        const id = req.params['id'];
        const { hostName, status, error } = req.body;
        logger.log(caller, 'INFO2', 'Host name: ' + hostName + ', id: ' + id + ', status: ' + status);
        if(!hostName) {
            logger.log(caller, 'ERROR', 'ERROR: hostName is undefined');
            res.set('Content-Type', 'application/json');
            res.status(400).send({ok: false, error: {msg: 'Host name is missing in request parameters'}});
        } else if(!this.requestList[hostName]) {
            logger.log(caller, 'ERROR', 'ERROR: requestList is undefined for host: ' + hostName);
            res.set('Content-Type', 'application/json');
            res.status(404).send({ok: false, error: {msg: 'RequestList not found for host: ' + hostName}});
        } else {
            if(this.heartbeatCtrl && !this.heartbeatCtrl.isOk(hostName)) { //Check hostName heartbeat
                logger.log(caller, 'WARNING', 'WARNING: Host not connected: ' + hostName);
            } else {
                //Find the cmd from cmd list
                const requestId = this.requestList[hostName].findIndex(x => x.cmd.id == id);
                logger.log(caller, 'DEBUG', 'requestId: ' + requestId);
                const request = this.requestList[hostName][requestId];
                if(!request) {
                    let msg = 'Cmd not found from request list. Host: ' + hostName + ', id: ' + id;
                    logger.log(caller, 'ERROR', 'ERROR: ' + msg);
                    res.set('Content-Type', 'application/json');
                    res.status(404).send({ok: false, error: {msg: msg}});
                } else if(request.status != 'processing') {
                    let msg = 'Cmd status is not processing. Host: ' + hostName + ', id: ' + id + ', status: ' + request.status;
                    logger.log(caller, 'ERROR', 'ERROR: ' + msg);
                    res.set('Content-Type', 'application/json');
                    res.status(400).send({ok: false, error: {msg: msg}});
                } else {
                    if(status != 'terminated') {
                        logger.log(caller, 'ERROR', 'ERROR: Cmd status: ' + status + ', host: ' + hostName + ', id: ' + id);
                        logger.log(caller, 'ERROR', 'ERROR: ' + error.msg);
                    } else
                        logger.log(caller, 'INFO0', 'Core agent cmd success. Host: ' + hostName + ', id: ' + id);
                    res.set('Content-Type', 'application/json');
                    res.status(200).send({ok: true});
                }
                this.requestList[hostName][requestId].onRequestUpdate(error, request.cmd, status);
                //Remove the cmd from the list
                this.requestList[hostName].splice(requestId, 1);
                logger.log(caller, 'DEBUG', 'Request deleted. requestList length: ' + this.requestList[hostName].length);
            }
        }
    }
}
module.exports = CoreCmd;