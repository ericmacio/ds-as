const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'cmdController');

class Cmd {
    constructor({ registrar }) {
        const caller = 'cmdController';
        this.requestList = new Object();
        this.registrar = registrar;
        this.registrar.on('registered', ({ hostName }) => {
            //Create empty list when host just registered
            this.requestList[hostName] = [];
        });
        this.registrar.on('refresh', ({ hostName }) => {
            //Create empty list if not exist
            if(!(hostName in this.requestList))
                this.requestList[hostName] = [];
        });
        this.registrar.on('unregistered', ({ hostName }) => {
            //Empty list when host just unregistered
            this.requestList[hostName] = [];
        });
    }
    updateRequest = ({ dialogId, hostName, status, token, data }) => {
        const caller = 'updateRequest';
        logger.log(caller, 'INFO2', 'Update request for hostName: ' + hostName);
        var found = false;
        for(var id=0; id<this.requestList[hostName].length; id++) {
            //Token must match
            if(this.requestList[hostName][id].cmd.token == token) {
                found = true;
                logger.log(caller, 'INFO2', 'Request have been found for token ' + token);
                this.requestList[hostName][id].status = status;
                this.requestList[hostName][id].dialogId = dialogId;
                this.requestList[hostName][id].onRequestUpdate(null, this.requestList[hostName][id].cmd, status, data);
                break;
            }
        }
        return found;
    }
    deleteRequest = ({ dialogId, hostName, status, token }) => {
        const caller = 'deleteRequest';
        logger.log(caller, 'INFO2', 'Delete request for hostName: ' + hostName);
        var found = false;
        for(var id=0; id<this.requestList[hostName].length; id++) {
            //Token must match
            if(this.requestList[hostName][id].cmd.token == token && this.requestList[hostName][id].dialogId == dialogId) {
                found = true;
                logger.log(caller, 'INFO2', 'Request have been found for token ' + token);
                //this.requestList[hostName][id].status = status;
                //Remove the request from the list
                this.requestList[hostName].splice(id, 1);
                logger.log(caller, 'INFO2', 'Request deleted. requestList length: ' + this.requestList[hostName].length);
                break;
            }
        }
        return found;
    }
    addRequest = ({ hostName, cmd, onRequestUpdate }) => {
        const caller = 'addRequest';
        logger.log(caller, 'INFO2', 'Add request for hostName: ' + hostName);
        //Add a new request containing this cmd to the current list
        if(!(hostName in this.requestList))
            this.requestList[hostName] = [];
        this.requestList[hostName].push({cmd, status: 'new', onRequestUpdate});
        logger.log(caller, 'DEBUG', 'Request list length: ' + this.requestList[hostName].length);
    }
    cancelAllRequests = (hostName) => {
        const caller = 'cancelAllRequests';
        logger.log(caller, 'INFO2', 'Cancel all requests for hostName: ' + hostName);
        if(this.requestList[hostName]) {
            logger.log(caller, 'DEBUG', 'Request list length: ' + this.requestList[hostName].length);
            for(let id=0; id<this.requestList[hostName].length; id++) {
                logger.log(caller, 'ERROR', 'ERROR: Cancel request id ' + id + ' for host ' + hostName);
                this.requestList[hostName][id].onRequestUpdate({msg: 'Request canceled'});
            }
        }
    }
    getCmd = async (req, res, next) => {
        const caller = 'getCmd';
        logger.log(caller, 'INFO2', '(get /cmds): Received ' + req.method + ' ' + req.path);
        //Query for new cmds by the AS agent
        var hostName = req.query.hostName;
        var maxCmds = req.query.max;
        var agentPollTimer = req.query.timer;
        logger.log(caller, 'INFO2', 'Host name: ' + hostName + ', maxCmds: ' + maxCmds + ', timer: ' + agentPollTimer);
        if(!hostName) {
            logger.log(caller, 'ERROR', 'ERROR: hostName is undefined');
            res.set('Content-Type', 'application/json');
            res.status(501).send({ok: false, error: {msg: 'Host name is missing in request parameters'}});
        } else if(!this.requestList[hostName]) {
            logger.log(caller, 'ERROR', 'ERROR: requestList is undefined for host: ' + hostName);
            res.set('Content-Type', 'application/json');
            res.status(404).send({ok: false, error: {msg: 'RequestList is undefined for host: ' + hostName}});
        } else {
            if(this.registrar && !this.registrar.isRegistered(hostName)) { //Check hostName is registered
                logger.log(caller, 'ERROR', 'ERROR: Received getCmd request on unregistered host: ' + hostName);
                res.set('Content-Type', 'application/json');
                res.status(404).send({ok: false, error: {msg: 'Host is not registered: ' + hostName}});
            } else {
                if(typeof(maxCmds) == 'undefined') {
                    logger.log(caller, 'WARNING', 'Max request is undefined. Set it to 1');
                    maxCmds = 1;
                }
                var nbNew = 0;
                var nbWaiting = 0;
                var nbPending = 0;
                var nbProcessing = 0;
                var nbTerminated = 0;
                var nbClosed = 0;
                var nbAborted = 0;
                for(var id=0; id<this.requestList[hostName].length; id++) {
                    if(this.requestList[hostName][id].status == 'new')
                        nbNew ++;
                    else if(this.requestList[hostName][id].status == 'waiting')
                        nbWaiting ++;
                    else if(this.requestList[hostName][id].status == 'pending')
                        nbPending ++;
                    else if(this.requestList[hostName][id].status == 'processing')
                        nbProcessing ++;
                    else if(this.requestList[hostName][id].status == 'terminated')
                        nbTerminated ++;
                    else if(this.requestList[hostName][id].status == 'closed')
                        nbClosed ++;
                    else if(this.requestList[hostName][id].status == 'aborted')
                        nbAborted ++;
                    else
                        logger.log(caller, 'WARNING', 'Cmd status: ' + this.requestList[hostName][id].status + ', id: ' + id);
                }
                logger.log(caller, 'INFO0', 'Nb of cmds [' + hostName + ']: ' + this.requestList[hostName].length +
                    '/' + nbNew + '/' + nbWaiting + '/' + nbPending + '/' + nbProcessing + '/' + nbTerminated + '/' + nbClosed + '/' + nbAborted);
                var cmdList = [];
                var id = 0;
                var nbCmds = 0;
                //Create the list of cmds to be sent back to the AS agent. Do not exceed max cmds allowed
                while((id < this.requestList[hostName].length) && (nbCmds < maxCmds)) {  
                    //Check request is for this hostName and status is new
                    if(this.requestList[hostName][id].status == 'new') {
                        //Add cmd into the list
                        logger.log(caller, 'INFO2', 'Put cmd of request id ' + id + ' in the cmd list');
                        cmdList.push(this.requestList[hostName][id].cmd);
                        //Request status is now waiting (sent to the AS agent for processing)
                        this.requestList[hostName][id].status = 'waiting';
                        nbCmds++;
                    }
                    id++;
                }
                logger.log(caller, 'INFO2', 'Max: ' + maxCmds + ', sent: ' + cmdList.length);
                if(cmdList.length < nbNew)
                    logger.log(caller, 'WARNING', 'WARNING: Remaining new cmds ...');
                var resp = {
                    cmdList: cmdList,
                    //Do not change timer used by client for polling
                    timer: agentPollTimer
                }
                res.set('Content-Type', 'application/json');
                res.status(200).send({ok: true, data: resp});
            }
        }
    }
}
module.exports = Cmd;