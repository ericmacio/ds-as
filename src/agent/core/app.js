const fork = require('child_process').fork;
const httpClient = require('../../utils/httpClient');
const Heartbeat = require('./Heartbeat');
const CorePollMgr = require('./CorePollMgr');
const Logger = require('../../logging/logger');
const VERSION = require('./.version.json').version;
const Config = require('../../../config/agent.json');
const { logToFile, logDir, logFileName } = Config.logger;
const logger = new Logger(__filename, 'appAgentCore', { logToFile, logDir, logFileName });
const caller = 'coreApp';
const IDLE = 'idle';
const ERROR = 'error';
const CLOSED = 'closed';
const EXITED = 'exited';
const RUNNING = 'running';
const STARTING = 'starting';
const STOPPING = 'stopping';
const STOPPED = 'stopped';
const REGISTERED = 'registered';
const UNREGISTERED = 'unregistered';
const UNREGISTERING = 'unregistering';
const CMD_IN_PROGRESS = 'cmdInProgress';
var agentProcess;
var status = {agentProcess: IDLE, corePollMgr: IDLE, heartbeat: IDLE};
const RESTART_AGENT_TIMERSEC = 20;
var agentTimer;
//Start the child agent process
startAgent = async () => {
    const caller = 'startAgent';
    return new Promise((resolve, reject) => {
        if(status.agentProcess != REGISTERED && status.agentProcess != RUNNING && status.agentProcess != STARTING) {
            //Clear current timeout in case of current recovering situation
            clearTimeout(agentTimer);
            agentProcess = fork('../agent/appAgent.js');
            status.agentProcess = STARTING;
            logger.log(caller, 'INFO0', 'New agent process status: ' + status.agentProcess);
            agentProcess.on('message', (msg) => {
                if(msg.type == 'start_cmd_completed') {
                    logger.log(caller, 'INFO2', 'Received message from Child process. Type: ' + msg.type);
                    status.agentProcess = RUNNING;
                    logger.log(caller, 'INFO0', 'New agent process status: ' + status.agentProcess);
                    resolve(msg.result);
                }
                if(msg.type == 'registered') {
                    logger.log(caller, 'INFO2', 'Received message from Child process. Type: ' + msg.type);
                    status.agentProcess = REGISTERED;
                    logger.log(caller, 'INFO0', 'New agent process status: ' + status.agentProcess);
                    resolve(msg.result);
                }
            });
            agentProcess.on('close', () => {
                //Agent has closed
                let msg = 'Child process closed';
                logger.log(caller, 'INFO0', msg);
                if(status.agentProcess == STOPPING) {
                    status.agentProcess = STOPPED;
                    resolve({ok: true});
                } else {
                    //Check there are no concurency restart processes
                    if(status.agentProcess != STOPPED && status.agentProcess != EXITED && status.agentProcess != ERROR) {
                        status.agentProcess = CLOSED;
                        logger.log(caller, 'INFO0', 'New agent process status: ' + status.agentProcess);
                        if(Config.autoStartAgent && status.heartbeat == RUNNING) {
                            logger.log(caller, 'WARNING', 'WARNING: Child process agent has been closed. Restart child process agent in ' + RESTART_AGENT_TIMERSEC + ' seconds');
                            clearTimeout(agentTimer);
                            agentTimer = setTimeout(() => {startAgent();}, RESTART_AGENT_TIMERSEC * 1000);
                        } else
                            logger.log(caller, 'INFO0', 'No need to restart agent process. autoStartAgent: ' + Config.autoStartAgent + ', heartbeat status: ' +  status.heartbeat);
                        resolve({ok: false, error: {msg: msg}});
                    }
                }
            });
            agentProcess.on('error', () => {
                //Agent has exited
                let msg = 'Child process error';
                logger.log(caller, 'ERROR', 'ERROR: ' + msg);
                //Check there are no concurency restart processes
                if(status.agentProcess != STOPPED && status.agentProcess != EXITED && status.agentProcess != CLOSED) {
                    status.agentProcess = ERROR;
                    logger.log(caller, 'INFO0', 'New agent process status: ' + status.agentProcess);
                    if(Config.autoStartAgent && status.heartbeat == RUNNING) {
                        logger.log(caller, 'WARNING', 'WARNING: Child process agent error. Restart child process agent in ' + RESTART_AGENT_TIMERSEC + ' seconds');
                        clearTimeout(agentTimer);
                        agentTimer = setTimeout(() => {startAgent();}, RESTART_AGENT_TIMERSEC * 1000);
                    }
                }
                resolve({ok: false, error: {msg: msg}});
            });
        } else {
            logger.log(caller, 'WARNING', 'WARNING: Child process already running cannot start.');
            if(status.agentProcess == RUNNING || status.agentProcess == STARTING) {
                logger.log(caller, 'WARNING', 'WARNING: agentProcess status id ' + status.agentProcess);
                logger.log(caller, 'WARNING', 'WARNING: Hum looks like a hang situation. Stop it asap');
                stopAgent();
            }
            resolve({ok: true});
        }
    });
}
//Stop the child agent process
stopAgent = async () => {
    const caller = 'stopAgent';
    return new Promise((resolve, reject) => {
        if(status.agentProcess == REGISTERED || status.agentProcess == RUNNING || status.agentProcess == STOPPING) {
            //Request the agent to unregister
            agentProcess.send({type: 'unregister_cmd'});
            status.agentProcess = UNREGISTERING;
            logger.log(caller, 'INFO0', 'New agent process status: ' + status.agentProcess);
            //Wait for cmd to be completed
            agentProcess.on('message', (msg) => {
                if(msg.type == 'unregister_cmd_completed') {
                    logger.log(caller, 'INFO2', 'Received message from Child process. Type: ' + msg.type);
                    status.agentProcess = UNREGISTERED;
                    logger.log(caller, 'INFO0', 'New agent process status: ' + status.agentProcess);
                    //Agent has unregistered itself on demand. Kill now agent process
                    agentProcess.kill('SIGTERM');
                    status.agentProcess = STOPPING;
                    logger.log(caller, 'INFO0', 'New agent process status: ' + status.agentProcess);
                }
            });
            //Check if child process exited once killed
            agentProcess.on('exit', () => {
                //Agent has exited
                let msg = 'Child process exited';
                logger.log(caller, 'INFO0', msg);
                if(status.agentProcess == STOPPING) {
                    status.agentProcess = STOPPED;
                    logger.log(caller, 'INFO0', 'New agent process status: ' + status.agentProcess);
                    resolve({ok: true});
                } else {
                    //Check there are no concurency restart processes
                    if(status.agentProcess != STOPPED && status.agentProcess != ERROR && status.agentProcess != CLOSED) {
                        status.agentProcess = EXITED;
                        logger.log(caller, 'INFO0', 'New agent process status: ' + status.agentProcess);
                        if(Config.autoStartAgent && status.heartbeat == RUNNING) {
                            logger.log(caller, 'WARNING', 'WARNING: Child process agent has been closed. Restart child process agent in ' + RESTART_AGENT_TIMERSEC + ' seconds');
                            clearTimeout(agentTimer);
                            agentTimer = setTimeout(() => {startAgent();}, RESTART_AGENT_TIMERSEC * 1000);
                        }
                        resolve({ok: false, error: {msg: msg}});
                    }
                }
            });
        } else {
            //No child process is running. Maybe it died just before receiving the cmd
            let msg = 'Child process not running cannot stop';
            logger.log(caller, 'ERROR', 'ERROR: ' + msg);
            resolve({ok: false, error: {msg: msg}});
        }
    });
}
//Execute the cmd received from the AS server
executeCoreCmd = async(cmd) => {
    const caller = 'executeCoreCmd';
    status.corePollMgr = CMD_IN_PROGRESS;
    var result;
    switch(cmd.name) {
        case 'start':
            logger.log(caller, 'INFO2', 'Received start command from server');
            //Start the agent process
            result = await startAgent();
            break;
        case 'stop':
            logger.log(caller, 'INFO2', 'Received stop command from server');
            result = await stopAgent();
            break;
        default:
            let msg = 'Bad command name: ' + cmd.name;
            logger.log(caller, 'ERROR', 'ERROR: ' + msg);
            result = {ok: false, error: {msg: msg}};
            break;
    }
    status.corePollMgr = RUNNING;
    return (result);
}
/*--------------------------------------------------------------------------------------------
		Main agent core
---------------------------------------------------------------------------------------------*/
//Start AS agent core 
logger.log(caller, 'INFO0', 'Start agent core. Version: ' + VERSION);
//Create heartbeat client
var heartbeat = new Heartbeat(Config.hostName, Config.proxy, Config.defaultHeartbeatTimer, VERSION);
//Create corePollMgr. will be started once heartbeat status is RUNNING
var corePollMgr = new CorePollMgr(Config.hostName, Config.proxy, Config.corePollMgr);
//Start heartbeat
heartbeat.start();
heartbeat.on('ok', () => {
    logger.log(caller, 'DEBUG', 'Heartbeat ok');
    //If error force corePollMgr to restart.
    logger.log(caller, 'DEBUG', 'status: corePollMgr: ' + status.corePollMgr + ', heartbeat: ' + status.heartbeat);
    //Start child agent process if needed
    if(Config.autoStartAgent && status.agentProcess == IDLE) {
        //Very first start
        logger.log(caller, 'INFO0', 'Start child process agent');
        startAgent(); //Asynchronous
    } else if(status.heartbeat == ERROR) {
        //Check if process has previously exited
        if(status.agentProcess == EXITED || status.agentProcess == CLOSED || status.agentProcess == ERROR) {
            //Restart the agent process
            if(Config.autoStartAgent) {
                logger.log(caller, 'WARNING', 'WARNING: Child process agent in one of these states: EXITED, CLOSED, ERROR. Restart child process agent asap');
                //First clear any current timer
                clearTimeout(agentTimer);
                startAgent();
            }
        } else //Inform the child process about the recovering situation
            agentProcess.send({type: 'heartbeat_recovered'});
    }
    //Start corePollMgr if still idle
    if(status.corePollMgr == IDLE) {
        //Start corePollMgr
        logger.log(caller, 'INFO2', 'Starting corePollMgr');
        status.corePollMgr = RUNNING;
        corePollMgr.start();
    } else if(status.heartbeat == ERROR) {
        if(status.corePollMgr != IDLE && status.corePollMgr != RUNNING && status.corePollMgr != CMD_IN_PROGRESS) {
            //Reset corePollMgr timer and restart
            logger.log(caller, 'INFO2', 'Reset corePollMgr timer');
            corePollMgr.resetTimer();
            //Restart corePollMgr asap
            logger.log(caller, 'INFO0', 'Restarting corePollMgr');
            status.corePollMgr = RUNNING;
            corePollMgr.start();
        }
    }
    status.heartbeat = RUNNING;
});
heartbeat.on('error', () => {
    logger.log(caller, 'ERROR', 'ERROR: Heartbeat on error');
    status.heartbeat = ERROR;
});
corePollMgr.on('error', () => {
    logger.log(caller, 'WARNING', 'WARNING: corePollMgr error');
    status.corePollMgr = ERROR;
});
corePollMgr.on('executeCmd', async (cmd) => {
    //Execute cmd
    logger.log(caller, 'INFO2', 'Execute command: ' + cmd.value.name);
    if(cmd.type != 'asAgent_core_cmd') {
        logger.log(caller, 'ERROR', 'ERROR: Bad cmd type: ' + cmd.type);
        var status = 'error';
    } else {
        try {
            var result = await executeCoreCmd(cmd.value);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: executeCoreCmd failed');
            //Fatal error. 
            logger.error(caller, error);
        }
        if(result.ok) {
            var status = 'terminated';
            logger.log(caller, 'INFO2', 'Command success: ' + cmd.value.name);
        } else {
            var status = 'error';
            var error = result.error;
            logger.log(caller, 'ERROR', 'ERROR: Command ' + cmd.value.name + ' result is ko');
        }
    }
    //Notify the AS about the cmd execution status
    const id = cmd.id;
    //Set URL value
    var url = '/coreCmds/' + id;
    var headers = {};
    const data = {hostName: Config.hostName, status, error};
    const requestData = {method: 'PUT', url: url, host: Config.proxy.host, port: Config.proxy.port, headers, data};
    try {
        var result = await httpClient.sendRequest(requestData);
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: httpClient.sendRequest failed');
        //Fatal error. 
        logger.error(caller, error);
    }
    if(!result.ok)
        logger.log(caller, 'DEBUG', 'ERROR: httpClient.sendRequest result is ko');
    //We have executed the request from AS server so we can restart the polling
    corePollMgr.restart();
});