const express = require('express');
const bodyParser = require('body-parser');
const registerRoute = require('./routes/register');
const heartbeatRoute = require('./routes/heartbeat');
const dialogRoute = require('./routes/dialog');
const coreCmdRoute = require('./routes/coreCmd');
const cmdRoute = require('./routes/cmd');
const Registrar = require('./controllers/Registrar');
const HeartbeatCtrl = require('./controllers/Heartbeat');
const DialogCtrl = require('./controllers/Dialog');
const CoreCmdCtrl = require('./controllers/CoreCmd');
const CmdCtrl = require('./controllers/Cmd');
const EventServer = require('../event/EventServer');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'Proxy');
const ProxyConfig = require('../../config/proxy.json');
const AgentVersion = require('../agent/agent/.version.json').version;
const { serverConfig } = require('../../config/asApi.json');
const STARTING = 'starting';
const STOPPING = 'stopping';
const STOPPED = 'stopped';
const REGISTERED = 'registered';
const UNREACHABLE = 'unreachable';

/*--------------------------------------------------------------------------------------------
		Proxy
---------------------------------------------------------------------------------------------*/
class Proxy {
    constructor() {
        const caller = 'Proxy';
        logger.log(caller, 'DEBUG', 'Create proxy');
        this.agentHostList = {};
        this.registrar = new Registrar(ProxyConfig.registrationExpiresSec);
        this.heartbeatCtrl = new HeartbeatCtrl(ProxyConfig.minHeartbeatTimer);
        this.coreCmdCtrl = new CoreCmdCtrl({ heartbeatCtrl: this.heartbeatCtrl });
        this.cmdCtrl = new CmdCtrl({ registrar: this.registrar });
        this.dialogCtrl = new DialogCtrl(this.cmdCtrl);
        this.eventServer = new EventServer('Agents notification', serverConfig.agentNotifier.port);
        this.eventServer.start();
    }
    notifyAgentCtrl(hostName) {
        const caller = 'notifyAgentCtrl';
        const { heartbeat, lastHeartbeatTime, started, registered, registrationTime, lastRegistrationTime, connections, status, coreVersion, agentVersion, mustUpdate } = this.agentHostList[hostName];
        const msg = {type: 'NotifyMessage', hostName, heartbeat, lastHeartbeatTime, started, registered, registrationTime, lastRegistrationTime, connections, status, coreVersion, agentVersion, mustUpdate }
        //Send msg to EventServer so that console client will be notified about agent status change
        this.eventServer.sendMsgToClient(msg);
    }
    generateToken() {
        const caller = 'generateToken';
        var len = 20;
        var stringPattern = '1234567890abcdefghijklmnopkrstuvwxyz';
        var token = '';
        for (var i = len; i > 0; i--)
            token += stringPattern[Math.floor(Math.random() * stringPattern.length)]; 
        return token;
    }
    start() {
        const caller = 'start';
        logger.log(caller, 'INFO1', 'Start proxy');
        this.proxyIdMap = [];
        //Start proxy server
        this.server();
        //Listen to registrar event
        this.registrar.on('registered', ({ hostName, version, registrationTime, lastRegistrationTime } ) => {
            logger.log(caller, 'INFO1', 'Registered received from host ' + hostName + ', version: ' + version);
            //Create entry if not exist yet
            if(!this.agentHostList[hostName]) this.agentHostList[hostName] = {registered: false, heartbeat: false, connections: [], status: REGISTERED, agentVersion: version, mustUpdate: false};
            //Has status changed ?
            const hasChanged = !this.agentHostList[hostName].registered || (this.agentHostList[hostName].agentVersion != version);
            this.agentHostList[hostName].registered = true;
            this.agentHostList[hostName].status = REGISTERED;
            this.agentHostList[hostName].registrationTime = registrationTime;
            this.agentHostList[hostName].lastRegistrationTime = lastRegistrationTime;
            //Check if remote agent must be updated
            let mustUpdate = false;
            if(version != AgentVersion) {
                let versionArray = version.split('.');
                let id = 0;
                while(!mustUpdate && id < ProxyConfig.agentVersions.length) {
                    let proxyVersion = ProxyConfig.agentVersions[id];
                    if(version == proxyVersion) {
                        mustUpdate = true;
                    } else {
                        let proxyVersionArray = proxyVersion.split('.');
                        let itemId = 0;
                        let mustContinue = true;
                        while(mustContinue && itemId < proxyVersionArray.length) {
                            if(proxyVersionArray[itemId] == '*') {
                                mustUpdate = true;
                                mustContinue = false;
                            } else if(proxyVersionArray[itemId] != versionArray[itemId]) {
                               mustContinue = false;
                            }
                            itemId++;
                        }
                    }
                    id++;
                }
            }
            if(mustUpdate) logger.log(caller, 'WARNING', 'WARNING: Agent must be updated. New version: ' + AgentVersion);
            this.agentHostList[hostName].agentVersion = version;
            this.agentHostList[hostName].mustUpdate = mustUpdate;
            //if(hasChanged) this.notifyAgentCtrl(hostName);
            this.notifyAgentCtrl(hostName); //Update client for each registration update to get last time value
        });
        this.registrar.on('unregistered', ({ hostName }) => {
            logger.log(caller, 'WARNING', 'WARNING: Host has been unregistered: ' + hostName);
            //Create entry if not exist yet
            if(!this.agentHostList[hostName]) this.agentHostList[hostName] = {registered: false, heartbeat: false, connections: [], status: UNREACHABLE};
            this.agentHostList[hostName].connections = [];
            //Has status changed ?
            const hasChanged = this.agentHostList[hostName].registered;
            this.agentHostList[hostName].registered = false;
            //Do not change unreachable status
            if(this.agentHostList[hostName].status != UNREACHABLE)
                this.agentHostList[hostName].status = STOPPED;
            if(hasChanged) this.notifyAgentCtrl(hostName);
        });
        //Listen to heartbeatMgr
        this.heartbeatCtrl.on('heartbeat', ({ hostName, coreVersion, lastHeartbeatTime }) => {
            logger.log(caller, 'INFO1', 'Heartbeat received from host: ' + hostName + ', coreVersion: ' + coreVersion);
            //Create entry if not exist yet
            if(!this.agentHostList[hostName]) this.agentHostList[hostName] = {registered: false, heartbeat: false, connections: [], status: UNREACHABLE, coreVersion};
            //Has status changed ?
            const hasChanged = !this.agentHostList[hostName].heartbeat || this.agentHostList[hostName].coreVersion != coreVersion;
            this.agentHostList[hostName].heartbeat = true;
            this.agentHostList[hostName].coreVersion = coreVersion;
            this.agentHostList[hostName].lastHeartbeatTime = lastHeartbeatTime;
            //If status was initally unreachable switch it to stopped status so that we can start it if not running
            if(this.agentHostList[hostName].status == UNREACHABLE)
                this.agentHostList[hostName].status = STOPPED;
            //Do not send each heartbeat update to the console
            if(hasChanged) this.notifyAgentCtrl(hostName);
        });
        this.heartbeatCtrl.on('timeOut', ({ hostName }) => {
            logger.log(caller, 'ERROR', 'ERROR: No heartbeat received from host ' + hostName);
            //Create entry if not exist yet
            if(!this.agentHostList[hostName]) this.agentHostList[hostName] = {registered: false, heartbeat: false, connections: [], status: UNREACHABLE};
            //Has status changed ?
            const hasChanged = this.agentHostList[hostName].heartbeat;
            this.agentHostList[hostName].status = UNREACHABLE;
            this.agentHostList[hostName].heartbeat = false;
            this.agentHostList[hostName].registered = false;
            this.agentHostList[hostName].connections = [];
            //Unregister it if registered
            if(this.registrar.isRegistered(hostName))
                this.registrar.unRegister(hostName);
            if(hasChanged) this.notifyAgentCtrl(hostName);
            this.cmdCtrl.cancelAllRequests(hostName);
        });
    }
    async sendCoreAgentCmd({ hostName, cmd } ) {
        const caller = 'sendCoreAgentCmd';
        return new Promise((resolve, reject) => {
            //onCompleted
            this.onCompleted = (error, cmd, status) => {
                const caller = 'onCompleted';
                //This is the callback function when receiving the response from the agent core
                if(error) {
                    logger.log(caller, 'ERROR', 'ERROR: asAgent_core_cmd request failed');
                    //Cmd failed. We must go back to the previous situation
                    if(this.agentHostList[cmd.hostName].status == STOPPING)
                        this.agentHostList[cmd.hostName].status = REGISTERED;
                    else if(this.agentHostList[cmd.hostName].status == STARTING)
                        this.agentHostList[cmd.hostName].status = STOPPED;
                    this.notifyAgentCtrl(cmd.hostName);
                    resolve({ok: false});
                } else {
                    logger.log(caller, 'INFO2', 'Receive As Agent response for asAgent_core_cmd ' + cmd.value.name + ', id : ' + cmd.id);
                    //Set dialogId and update status with info returned by the AS agent
                    logger.log(caller, 'INFO2', 'New request status: ' + status);
                    if(status == 'terminated') {
                        //Request have been fully processed by the AS agent. The remote AS agent has been successfully started
                        logger.log(caller, 'INFO0', 'Request terminated for asAgent_core_cmd ' + cmd.value.name);
                        this.agentHostList[cmd.hostName].started = true;
                        if(cmd.value.name == 'start' || cmd.value.name == 'stop') {
                            this.agentHostList[cmd.hostName].status = (cmd.value.name == 'start') ? REGISTERED : STOPPED;
                            this.notifyAgentCtrl(cmd.hostName);
                        }
                        //Return the proxy and asAgent Ids to the caller thanks to its callback function stored in request context
                        resolve({ok: true});
                    } else {
                        if(status == 'error') 
                            logger.log(caller, 'ERROR', 'ERROR: Request status is error');
                        else
                            logger.log(caller, 'ERROR', 'ERROR: Bad request status: ' + status);
                        //Cmd failed. We must go back to the previous situation
                        if(this.agentHostList[cmd.hostName].status == STOPPING)
                            this.agentHostList[cmd.hostName].status = REGISTERED;
                        else if(this.agentHostList[cmd.hostName].status == STARTING)
                            this.agentHostList[cmd.hostName].status = STOPPED;
                        this.notifyAgentCtrl(cmd.hostName);
                        resolve({ok: false});
                    }
                }
            };
            logger.log(caller, 'INFO0', 'Send agent cmd for host ' + hostName + ', cmd name: ' + cmd.name);
            //Initialize hostList for this host if needed
            if(!this.agentHostList[hostName]) this.agentHostList[hostName] = {registered: false, heartbeat: false, connections: [], status: UNREACHABLE};
            //Check host heartbeat status before connecting to the remote agent
            if(!this.agentHostList[hostName].heartbeat) {
                logger.log(caller, 'ERROR', 'ERROR: Heartbeat status is ko for hostName ' + hostName + '. Cannot start agent');
                this.agentHostList[hostName].status = UNREACHABLE;
                this.notifyAgentCtrl(hostName);
                resolve({ok: false});
            } else {
                //Create cmd to be send to the AS agent core
                //Assign an id to this cmd to link it back to the request when receiving the response from the AS agent core
                const agentCmd = {
                    hostName: hostName,
                    type: 'asAgent_core_cmd',
                    value: cmd,
                    id: this.generateToken()
                }
                logger.log(caller, 'INFO2', 'Proxy create agent cmd: ' + JSON.stringify(agentCmd));
                //Add request to the request list
                //Status is new
                logger.log(caller, 'INFO2', 'Proxy add request with id: ' + agentCmd.id);
                //Add a new request containing this cmd to the cmdCtrl
                this.coreCmdCtrl.addRequest({ hostName, cmd: agentCmd, onRequestUpdate: this.onCompleted.bind(this) });
                if(agentCmd.value.name == 'start' || agentCmd.value.name == 'stop') {
                    this.agentHostList[hostName].status = (agentCmd.value.name == 'start') ? STARTING : STOPPING;
                    this.notifyAgentCtrl(hostName);
                }
            }
        });
    }
    async connect(serviceName, key, config) {
        const caller = 'connect';
        //Create a remote dataConnector hosted by an AS agent
        return new Promise((resolve, reject) => {
            //oncreated
            this.onCreated = (error, cmd, status, agentData) => {
                const caller = 'onCreated';
                //This is the callback function when receiving the response from the AS agent
                logger.log(caller, 'INFO2', 'onCreated called');
                if(error) {
                    logger.log(caller, 'ERROR', 'ERROR: create_dataConnector cmd failed');
                    resolve({ok: false});
                } else {
                    logger.log(caller, 'INFO2', 'Receive As Agent response for asAgent_cmd ' + cmd.value + ', token : ' + cmd.token);
                    logger.log(caller, 'INFO2', 'Response: ' + JSON.stringify(agentData));
                    //Set dialogId and update status with info returned by the AS agent
                    logger.log(caller, 'INFO1', 'New request status: ' + status);
                    if(status == 'terminated') {
                        //Request have been fully processed by the AS agent. The remote AS agent DataConnector has been created then
                        logger.log(caller, 'INFO1', 'Request terminated for asAgent_cmd ' + cmd.value);
                        //Create proxyId and link it to hostName and asAgentId
                        var proxyId = this.generateToken();
                        this.proxyIdMap[proxyId] = {
                            asAgentId: agentData.data.asAgentId,
                            hostName: cmd.hostName
                        };
                        logger.log(caller, 'DEBUG', 'proxyId: ' + proxyId);
                        this.agentHostList[cmd.hostName].connections.push({proxyId, asAgentId: this.proxyIdMap[proxyId].asAgentId, type: cmd.data.config.type, params: cmd.data.config.params});
                        this.notifyAgentCtrl(cmd.hostName);
                        //Return the proxy and asAgent Ids to the caller thanks to its callback function stored in request context
                        resolve({ok: true, data: {proxyId: proxyId, asAgentId: agentData.data.asAgentId}});
                    } else if(status == 'aborted') {
                        //Request have been aborted by the AS agent. Return error then
                        logger.log(caller, 'ERROR', 'ERROR: Request has been aborted');
                        resolve({ok: false});
                    }
                }
            };
            const hostName = config.access.hostName;
            //Check host is registered before connecting to the remote agent
            if(!this.agentHostList[hostName] || !this.agentHostList[hostName].registered) {
                logger.log(caller, 'ERROR', 'ERROR: The hostName ' + hostName + ' is not registered. Cannot send connection request');
                resolve({ok: false});
            }
            //Check host heartbeat status before connecting to the remote agent
            if(!this.agentHostList[hostName].heartbeat) {
                logger.log(caller, 'ERROR', 'ERROR: Heartbeat status is ko for hostName ' + hostName + '. Cannot send connection request');
                resolve({ok: false});
            }
            //Create cmd to be send to the AS agent
            //Assign a token to this cmd to link it back to the request when receiving the response from the AS agent
            var cmd = {
                serviceName: serviceName,
                key: key,
                hostName: hostName,
                type: 'asAgent_cmd',
                value: 'create_dataConnector',
                data: {type: config.type, config: config},
                token: this.generateToken()
            }
            logger.log(caller, 'INFO2', 'Proxy create cmd: ' + JSON.stringify(cmd));
            //Add request to the request list
            //Status is new
            logger.log(caller, 'INFO2', 'Proxy add request with token: ' + cmd.token);
            //Add a new request containing this cmd to the cmdCtrl
            this.cmdCtrl.addRequest({ hostName, cmd, onRequestUpdate: this.onCreated.bind(this) });
        });
    }
    async close(serviceName, key, config, proxyId, asAgentId) {
        const caller = 'close';
        //Delete the remote dataConnector
        return new Promise((resolve, reject) => {
            //oncreated
            this.onDeleted = (error, cmd, status, agentData) => {
                const caller = 'onDeleted';
                //This is the callback function when receiving the response from the AS agent
                logger.log(caller, 'INFO2', 'onDeleted called');
                if(error) {
                    logger.log(caller, 'ERROR', 'ERROR: delete_asAgentDataConnector cmd failed');
                    resolve({ok: false});
                } else {
                    logger.log(caller, 'INFO2', 'Receive As Agent response for asAgent_cmd ' + cmd.value + ', token : ' + cmd.token);
                    logger.log(caller, 'INFO2', 'Response: ' + JSON.stringify(agentData));
                    logger.log(caller, 'INFO1', 'New request status: ' + status);
                    if(status == 'terminated') {
                        //Request have been fully processed by the AS agent. The remote AS agent DataConnector has been deleted then
                        logger.log(caller, 'INFO1', 'Request terminated for asAgent_cmd ' + cmd.value);
                        var connectionId = -1;
                        logger.log(caller, 'DEBUG', 'proxyId: ' + cmd.proxyId);
                        for(let id=0; id<this.agentHostList[cmd.hostName].connections.length; id++) {
                            logger.log(caller, 'DEBUG', 'Connection: ' + JSON.stringify(this.agentHostList[cmd.hostName].connections[id]));
                            if(this.agentHostList[cmd.hostName].connections[id].proxyId == cmd.proxyId) {
                                connectionId = id;
                                break;
                            }
                        }
                        if(connectionId >= 0) {
                            logger.log(caller, 'DEBUG', 'Connection found for hostName: ' + cmd.hostName + ' and proxyId: ' + cmd.proxyId);
                            //Remove connection from table
                            this.agentHostList[cmd.hostName].connections.splice(connectionId, 1);
                            this.notifyAgentCtrl(cmd.hostName);
                            resolve({ok: true});
                        } else {
                            logger.log(caller, 'ERROR', 'ERROR: Connection not found for hostName: ' + cmd.hostName + ' and proxyId: ' + cmd.proxyId);
                            resolve({ok: false});
                        }
                    } else if(status == 'aborted') {
                        //Request have been aborted by the AS agent. Return error then
                        logger.log(caller, 'ERROR', 'ERROR: Request has been aborted');
                        resolve({ok: false});
                    }
                }
            };
            const hostName = config.access.hostName;
            //Check host is registered before sending the request
            if(!this.agentHostList[hostName].registered) {
                logger.log(caller, 'ERROR', 'ERROR: The hostName ' + hostName + ' is not registered. Cannot send close request');
                resolve({ok: false});
                return;
            }
            //Check host heartbeat status before connecting to the remote agent
            if(!this.agentHostList[hostName].heartbeat) {
                logger.log(caller, 'ERROR', 'ERROR: Heartbeat status is ko for hostName ' + hostName + '. Cannot send close request');
                resolve({ok: false});
                return;
            }
            //We must also check proxy and agent ids
            if((this.proxyIdMap[proxyId].asAgentId != asAgentId) || (this.proxyIdMap[proxyId].hostName != hostName)) {
                logger.log(caller, 'ERROR', 'ERROR: asAgentId ' +  asAgentId + ', or hostname ' + cmconfig.accessd.hostname + ' are unexpected with proxyId ' + proxyId);
                throw new Error('Unexpected asAgentId or hostName');
            }
            //Create cmd to be send to the AS agent
            //Assign a token to this cmd to link it back to the request when receiving the response from the AS agent
            var cmd = {
                serviceName: serviceName,
                key: key,
                hostName: hostName,
                type: 'asAgent_cmd',
                value: 'delete_dataConnector',
                data: {asAgentId: asAgentId},
                proxyId: proxyId,
                token: this.generateToken()
            }
            logger.log(caller, 'INFO2', 'Proxy delete cmd: ' + JSON.stringify(cmd));
            //Add request to the request list
            //Status is new
            logger.log(caller, 'INFO2', 'Proxy add request with token: ' + cmd.token);
            //Add a new request containing this cmd to the cmdCtrl
            this.cmdCtrl.addRequest({ hostName, cmd, onRequestUpdate: this.onDeleted.bind(this) });
        });
    }
    async sendCmd(cmd) {
        const caller = 'sendCmd';
        return new Promise((resolve, reject) => {
            this.onRequestUpdate = (error, cmd, status, agentData) => {
                const caller = 'onRequestUpdate';
                //This is the callback function when receiving the response from the AS agent
                logger.log(caller, 'INFO2', 'onRequestUpdate');
                if(error) {
                    logger.log(caller, 'ERROR', 'ERROR: Cmd failed');
                    resolve({ok: false});
                } else {
                    logger.log(caller, 'INFO2', 'Receive As Agent response for asAgentDataConnector_cmd ' + cmd.value + ', token : ' + cmd.token);
                    logger.log(caller, 'INFO2', 'Response: ' + JSON.stringify(agentData));
                    logger.log(caller, 'INFO1', 'New request status: ' + status);
                    if(status == 'terminated') {
                        //Request have been fully processed by the AS agent
                        logger.log(caller, 'INFO1', 'Request terminated for asAgentDataConnector_cmd ' + cmd.value);
                        resolve({ok: true, data: agentData.data});
                    } else if(status == 'aborted') {
                        //Request have been aborted by the AS agent. Return error then
                        logger.log(caller, 'ERROR', 'ERROR: Request has been aborted');
                        resolve({ok: false});
                    }
                }
            }
            logger.log(caller, 'INFO2', 'Proxy receive cmd from dataConnector id: ' + cmd.proxyId + ', to as dataConnector id: ' + cmd.asAgentId);
            //First check hostName has been registered
            if(!this.registrar.isRegistered(cmd.hostName)) {
                logger.log(caller, 'ERROR', 'ERROR: The hostName ' + cmd.hostName + ' is not registered. Cannot send cmd');
                resolve({ok: false});
            }
            //Check host heartbeat sttaus before connecting to the remote agent
            if(!this.agentHostList[cmd.hostName].heartbeat) {
                logger.log(caller, 'ERROR', 'ERROR: Heartbeat status is ko for hostName ' + cmd.hostName + '. Cannot send request');
                resolve({ok: false});
            }
            //We must also check proxy and agent ids
            if((this.proxyIdMap[cmd.proxyId].asAgentId != cmd.asAgentId) || (this.proxyIdMap[cmd.proxyId].hostName != cmd.hostName)) {
                logger.log(caller, 'ERROR', 'ERROR: asAgentId ' +  cmd.asAgentId + ', or hostname ' + cmd.hostname + ' are unexpected with proxyId ' + cmd.proxyId);
                throw new Error('Unexpected asAgentId or hostName');
            }
            //Add token to the cmd before sending it to the agent
            cmd.token = this.generateToken();
            logger.log(caller, 'INFO2', 'Proxy add cmd: ' + JSON.stringify(cmd));
            this.cmdCtrl.addRequest({ hostName: cmd.hostName, cmd, onRequestUpdate: this.onRequestUpdate.bind(this) });
        });
    }
    isHeartbeatOk(hostName) {
        const caller = 'isHeartbeatOk';
        return (this.agentHostList[hostName] && this.agentHostList[hostName].heartbeat);
    }
    isStarted(hostName) {
        const caller = 'isRegistered';
        return (this.agentHostList[hostName] && this.agentHostList[hostName].started);
    }
    isRegistered(hostName) {
        const caller = 'isRegistered';
        return (this.agentHostList[hostName] && this.agentHostList[hostName].registered);
    }
    getConnections(hostName) {
        const caller = 'getConnections';
        return (this.agentHostList[hostName] && this.agentHostList[hostName].connections);
    }
    getStatus(hostName) {
        const caller = 'getStatus';
        return (this.agentHostList[hostName] ? this.agentHostList[hostName].status : UNREACHABLE);
    }
    getMustUpdate(hostName) {
        const caller = 'getMustUpdate';
        return (this.agentHostList[hostName] && this.agentHostList[hostName].mustUpdate);
    }
    server() {
        var caller = 'server';
        const registerRouter = registerRoute.getRouter(this.registrar);
        const heartbeatRouter = heartbeatRoute.getRouter(this.heartbeatCtrl);
        const coreCmdRouter = coreCmdRoute.getRouter(this.coreCmdCtrl);
        const cmdRouter = cmdRoute.getRouter(this.cmdCtrl);
        const dialogRouter = dialogRoute.getRouter(this.dialogCtrl);
        //Create app express instance
        const app = express()
            .use(bodyParser.urlencoded({ extended: false }))
            .use(bodyParser.json())
            .use('/register', registerRouter)
            .use('/heartbeat', heartbeatRouter)
            .use('/coreCmds', coreCmdRouter)
            .use('/cmds', cmdRouter)
            .use('/dialogs', dialogRouter)
            .listen(ProxyConfig.port);
        logger.log(caller, 'INFO1', 'Proxy server has been started on port ' + ProxyConfig.port);
    }
}
module.exports = Proxy;