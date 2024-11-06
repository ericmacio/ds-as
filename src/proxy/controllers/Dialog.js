const EventEmitter = require('events').EventEmitter;
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'dialogController');

class Dialog extends EventEmitter {
    constructor(cmdCtrl) {
        super();
        this.cmdCtrl = cmdCtrl;
    }
    generateToken = () => {
        const caller = 'generateToken';
        var len = 20;
        var stringPattern = '1234567890abcdefghijklmnopkrstuvwxyz';
        var token = '';
        for (var i = len; i > 0; i--)
            token += stringPattern[Math.floor(Math.random() * stringPattern.length)]; 
        return token;
    }
    createDialog = async (req, res, next) => {
        const caller = 'createDialog';
        //Create a new dialog on AS agent request
        logger.log(caller, 'INFO2', '(post /dialogs): Received ' + req.method + ' ' + req.path);
        logger.log(caller, 'INFO2', '(post /dialogs): Received data ' + JSON.stringify(req.body));
        //Get data sent by the AS agent
        const token = req.body.dialog.token;
        const status = req.body.dialog.status;
        const hostName = req.body.hostName;
        logger.log(caller, 'INFO2', 'Receive POST dialogs with hostName: ' + hostName + ', token: ' + token);
        this.emit('create', { hostName, status, token });
        const dialogId = this.generateToken();
        //Update request from cmdCtrl
        const found = this.cmdCtrl.updateRequest({ dialogId, hostName, status, token, data: req.body });
        res.set('Content-Type', 'application/json');
        if(!found) {
            logger.log(caller, 'ERROR', 'ERROR: Cmd token not found: ' + token);
            res.status(404).send({ok: false, error: {msg: 'Token not found: ' + token}});
        } else
            res.status(200).send({ok: true, data: { dialogId }});
    }
    updateDialog = async (req, res, next) => {
        const caller = 'updateDialog';
        //Modify dialog
        logger.log(caller, 'INFO2', '(put /dialogs): Received ' + req.method + ' ' + req.path);
        logger.log(caller, 'DEBUG', '(put /dialogs): Received data ' + JSON.stringify(req.body));
        const dialogId = req.params['id'];
        const token = req.body.dialog.token;
        const status = req.body.dialog.status;
        const hostName = req.body.hostName;
        logger.log(caller, 'INFO2', 'Receive PUT dialogs with hostName: ' + hostName + ', dialogId: ' + dialogId + ', token: ' + token);
        //Update request from cmdCtrl
        const found = this.cmdCtrl.updateRequest({ dialogId, hostName, status, token, data: req.body });
        res.set('Content-Type', 'application/json');
        if(!found) {
            logger.log(caller, 'ERROR', 'ERROR: Cmd token not found: ' + token);
            res.status(404).send({ok: false, error: {msg: 'Token not found: ' + token}});
        } else
            res.status(200).send({ok: true, data: 'ok'});
    }
    deleteDialog = async (req, res, next) => {
        const caller = 'deleteDialog';
        //Delete dialog
        logger.log(caller, 'INFO2', '(delete /dialogs): Received ' + req.method + ' ' + req.path);
        logger.log(caller, 'DEBUG', '(delete /dialogs): Received data ' + JSON.stringify(req.body));
        const dialogId = req.params['id'];
        const token = req.body.dialog.token;
        const status = req.body.dialog.status;
        const hostName = req.body.hostName;
        logger.log(caller, 'INFO2', 'Receive DELETE dialogs with hostName: ' + hostName + ', dialogId: ' + dialogId + ', token: ' + token);
        //Update request from cmdCtrl
        const found = this.cmdCtrl.deleteRequest({ dialogId, hostName, status, token });
        res.set('Content-Type', 'application/json');
        if(!found) {
            logger.log(caller, 'ERROR', 'ERROR: Cmd token not found: ' + token);
            res.status(404).send({ok: false, error: {msg: 'Token not found: ' + token}});
        } else {
            res.status(200).send({ok: true, data: 'ok'});
        }
    }
}
module.exports = Dialog;