const Register = require('./Register');
const PollMgr = require('./PollMgr');
const DataConnectors = require('../../DataConnectors');
const Logger = require('../../logging/logger');
const VERSION = require('./.version.json').version;
const caller = 'appAgent';
const Config = require('../../../config/agent.json');
const { logToFile, logDir, logFileName } = Config.logger;
const logger = new Logger(__filename, 'appAgent', { logToFile, logDir, logFileName });
var dataConnectorList = new Object;
/*--------------------------------------------------------------------------------------------
		executeCmd
---------------------------------------------------------------------------------------------*/
executeCmd = async (cmd, callback) => {
    const caller = 'executeCmd';
    switch(cmd.type) {
        case 'asAgent_cmd':
            //This is an management command for the AS agent
            switch(cmd.value) {
                case 'create_dataConnector':
                    //Warning. Set agent dataConnector to be local. Could also be remote ??
                    cmd.data.config.access.type = 'local';
                    logger.log(caller, 'DEBUG', 'Access: ' + cmd.data.config.access.type);
                    var dataConnector = new DataConnectors[cmd.data.type](cmd.serviceName, cmd.key, cmd.data.config, null); //No proxy here
                    var asAgentId = Math.floor(Math.random() * 100000);
                    dataConnectorList[asAgentId] = dataConnector;
                    logger.log(caller, 'INFO2', 'Cmd: create_dataConnector, type: ' + cmd.data.config.type + ', id: ' + asAgentId);
                    callback(null, {'asAgentId' : asAgentId});
                    break;
                case 'delete_dataConnector':
                    logger.log(caller, 'INFO1', 'Cmd: delete_dataConnector, asAgentId: ' + cmd.data.asAgentId);
                    if(typeof(dataConnectorList[cmd.data.asAgentId]) == 'undefined') {
                        logger.log(caller, 'ERROR', 'ERROR: DataConnector does not exist. asAgentId: ' + cmd.data.asAgentId + ', cmd: ' + cmd.value);
                        return callback({msg: 'DataConnector does not exist for this asAgentId ' + cmd.data.asAgentId});
                    }
                    delete dataConnectorList[cmd.data.asAgentId];
                    logger.log(caller, 'INFO2', 'dataConnector deleted for asAgentId: ' + cmd.data.asAgentId);
                    logger.log(caller, 'INFO2', 'dataConnector list length: ' + Object.keys(dataConnectorList).length);
                    callback(null);
                    break;
                default:
                    logger.log(caller, 'ERROR', 'ERROR: Bad cmd value: ' + cmd.value);
                    callback({msg: 'Cmd not supported. Value: ' + cmd.value + '. Cmd: ' + JSON.stringify(cmd)});
                    break;
            }
            break;
        case 'dataConnector_cmd':
            //This is a DataConnector command
            switch(cmd.value) {
                case 'access':
                case 'fileTime':
                case 'read':
                    logger.log(caller, 'INFO2', 'Cmd: ' + cmd.value + ' , asAgentId: ' + cmd.asAgentId);
                    //Invoke the appropriate command from local DataConnector
                    //First check local DataConnector exists
                    if(typeof(dataConnectorList[cmd.asAgentId]) != 'undefined') {
                        try {
                            const result = await dataConnectorList[cmd.asAgentId][cmd.value]();
                            if(!result.ok) {
                                logger.log(caller, 'ERROR', 'ERROR: DataConnector cmd failed: ' + cmd.value);
                                callback({msg: 'Cmd failed: ' + JSON.stringify(cmd)});
                            } else
                                callback(null, result.data);
                        } catch(error) {
                            logger.log(caller, 'ERROR', 'ERROR: DataConnector cmd failed: ' + cmd.value + ': ' + error);
                            callback({msg: 'DataConnector cmd failed'});
                        }
                    } else {
                        logger.log(caller, 'ERROR', 'ERROR: DataConnector does not exist. Id: ' + cmd.asAgentId + ', cmd: ' + cmd.value);
                        callback({msg: 'DataConnector does not exist. Cmd: ' + JSON.stringify(cmd)});
                    }
                    break;
                default:
                    logger.log(caller, 'ERROR', 'ERROR: Bad cmd value: ' + cmd.value);
                    callback({msg: 'Cmd not supported. Value: ' + cmd.value + '. Cmd: ' + JSON.stringify(cmd)});
                    break;
            }
            break;
        default:
            logger.log(caller, 'ERROR', 'ERROR: Bad type: ' + cmd.type);
            callback({msg: 'Cmd type not supported. Type: ' + cmd.type + '. Cmd: ' + JSON.stringify(cmd)});
            break;
    }
}
/*--------------------------------------------------------------------------------------------
		Main
---------------------------------------------------------------------------------------------*/
//Start AS agent execution
logger.log(caller, 'INFO0', 'Starting agent process ... Version: ' + VERSION);
const IDLE = 'idle';
const OK = 'ok';
const ERROR = 'error';
var status = {register: IDLE, pollMgr: IDLE};
//Create pollMgr
var pollMgr = new PollMgr(Config.hostName, Config.proxy, Config.pollMgr);
//Create register client
var register = new Register(Config.hostName, Config.proxy, Config.defaultExpires, Config.registerRetryTimer, VERSION);
//Start registration process
register.start(false);
register.on('registered', () => {
    logger.log(caller, 'INFO2', 'Registered');
    status.register = OK;
    process.send({type: 'registered'});
    //Start pollMgr if still idle or in error
    if(status.pollMgr == IDLE || status.pollMgr == ERROR) {
        if(status.pollMgr == ERROR) {
            //Reset timer 
            logger.log(caller, 'INFO2', 'Reset pollMgr timer');
            pollMgr.resetTimer();
        }
        //Restart it asap
        pollMgr.start();
        status.pollMgr = OK;
    }
});
register.on('error', () => {
    logger.log(caller, 'WARNING', 'Agent registration process failed');
    status.register = ERROR;
});
register.on('unregistered', () => {
    logger.log(caller, 'WARNING', 'Agent has been unregistered');
    status.register = IDLE;
    process.send({type: 'unregister_cmd_completed', result: {ok: true}});
});
pollMgr.on('executeCmd', (cmd) => {
    executeCmd(cmd, (error, data) => {
        if(error) {
            logger.log(caller, 'ERROR', 'ERROR: executeCmd failed: ' + error.msg);
            var error = {msg: 'Cmd execution failed. Type: ' + cmd.type + ', value: ' + cmd.value + '. Error: ' + error.msg};
        }
        pollMgr.continue(error, cmd, data);
    });
});
pollMgr.on('checkCmd', (cmd) => {
    //Check command is supported by this agent
    if(!(Config.cmdList[cmd.type].includes(cmd.value))) {
        logger.log(caller, 'ERROR', 'ERROR: cmd is not included in cmdList. Type: ' + cmd.type + ', value: ' + cmd.value);
        //We must abort dialog due to error
        var error = {msg: 'Cmd is not specified in agent config file: ' + JSON.stringify(cmd)};
    //Check hostName in cmd match with local hostName
    } else if(cmd.hostName != Config.hostName) {
        logger.log(caller, 'ERROR', 'ERROR: cmd hostName does not match local hostName: cmd.hostName: ' + cmd.hostName + ', local hostName: ' + Config.hostName);
        //We must abort dialog due to error
        var error = {msg: 'Bad hostname: ' + cmd.hostName + ', cmd can not be executed: ' + cmd.value};
    }
    pollMgr.continue(error, cmd, null);
});
pollMgr.on('error', () => {
    logger.log(caller, 'WARNING', 'WARNING: PollMgr error');
    status.pollMgr = ERROR;
});
process.send({type: 'start_cmd_completed', result: {ok: true}});
process.on('message', (msg) => {
    logger.log(caller, 'INFO0', 'Receive msg from core: ' + msg.type);
    if(msg.type == 'unregister_cmd') {
        register.unregister();
    } else if(msg.type == 'heartbeat_recovered') {
        //It's likely that we lost connection with AS server. Force registration then
        //Once registered we will restart pollMgr if needed
        if(!register.isRegistered()) {
            register.start(false);
            logger.log(caller, 'INFO0', 'Not register yet. Force registration');
        }
    } else
        logger.log(caller, 'ERROR', 'ERROR: unknown msg type: ' + msg.type);
});