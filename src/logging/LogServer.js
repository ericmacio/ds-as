const webSocketServer = require('ws').Server;
const Logger = require('./logger');
const logger = new Logger(__filename, 'LogServer');
const { logServerPort } = require('../../config/logger.json');
/*--------------------------------------------------------------------------------------------
		LogServer
---------------------------------------------------------------------------------------------*/
class LogServer {
	constructor() {
		var caller = "LogServer";
		this.logClientList = [];
	}
	// server
	start() {
		//Create web socket server
		var caller = "start";
		var wsServer = new webSocketServer({port: logServerPort});
		logger.log(caller, 'INFO1', 'Logger socket server has been started on port ' + logServerPort);
		//Event: webSocket client connection
		wsServer.on('connection', (connection) => {
			connection.on('message', (message) => {
				try {
					var msg = JSON.parse(message);
				} catch(err) {
					logger.log(caller, 'ERROR', 'ERROR: cannot parse JSON data from server: ' + error);
				}
				if(msg) {
					switch(msg.type) {
						case "hello":
							var logConfig = msg.data;
							const logMaskList = logger.getLogMaskList();
							logger.log(caller, 'INFO2', 'logMaskList: ' + JSON.stringify(logMaskList));
							logger.log(caller, 'INFO2', 'logLevelName: ' + logConfig.logLevelName);
							var logClient = {
								clientId: this.logClientList.length,
								logMask:  logMaskList[logConfig.logLevelName],
								logTypeList: logConfig.logTypeList,
								logServiceName: logConfig.logServiceName,
								logServiceList: logConfig.logServiceList,
								logFileName: logConfig.logFileName
							};
							this.logClientList.push(logClient);
							connection.clientId = logClient.clientId;
							this.logClientList[logClient.clientId].connection = connection;
							var msg = 'New log client. id: ' + logClient.clientId + '. log mask: ' + logClient.logMask;
							logger.log(caller, 'INFO0', msg);
							var date = new Date();
							var msec = date.getMilliseconds();
							if(msec<10) msec = "0" + msec;
							var logMsg = {
								type: 'helloResponse',
								level: 'INFO0',
								text: 'Connected to remote logging server',
								clientId: logClient.clientId,
								app: 'LogServer',
								date: date.toLocaleDateString(),
								time: date.toLocaleTimeString() + ":" + msec,
								file: __filename,
								caller: caller
							}
							//Send Hello response message to the ws client
							connection.send(JSON.stringify(logMsg));
							break;
						case 'setConfig':
							var logConfig = msg.data;
							logger.log(caller, 'DEBUG', 'logConfig: ' + JSON.stringify(logConfig));
							var logClient = this.logClientList.find((logClient) => logClient.clientId == logConfig.clientId);
							if(logClient) {
								const logMaskList = logger.getLogMaskList()
								logClient.logMask =  logMaskList[logConfig.logLevelName];
								logClient.logTypeList = logConfig.logTypeList;
								logClient.logServiceName = logConfig.logServiceName;
								logClient.logFileName = logConfig.logFileName;
								var msg = 'Modify log client. id: ' + logClient.clientId + '. log mask: ' + logClient.logMask + ', type list: ' + JSON.stringify(logClient.logTypeList) + ', logServiceName: ' + logClient.logServiceName + ', logFileName: ' + logClient.logFileName;
								logger.log(caller, 'INFO0', msg);
							} else 
								logger.log(caller, 'ERROR', 'ERROR: Client id not found: ' + clientId);
							break;
						default:
							logger.log(caller, 'WARNING', 'WARNING: Undefined msg type: ' + msg.type);
							break;
					}
				}
			});
			connection.on('close', () => {
				for(var id=0 ;id<this.logClientList.length; id++) {
					if(this.logClientList[id].clientId == connection.clientId) {
						//Remove client from table
						this.logClientList.splice(id,1);
						var msg = 'Connection closed with Log server. Client id: ' + connection.clientId;
						logger.log(caller, 'INFO0', msg);
						break;
					}
				}
			});
		});
	}
	// sendMsgToClient
	sendMsgToClient(msg, logFileName) {
		var caller = "sendMsgToClient";
		for(var id=0; id<this.logClientList.length; id++) {
			var client = this.logClientList[id];
			const logService = client.logTypeList.services;
			const logServer = client.logTypeList.server;
			const isAservice = client.logServiceList.includes(msg.app);
			const isLogFileName = client.logFileName == logFileName;
			//console.log('logServiceName: ' + client.logServiceName);
			//console.log('app: ' + msg.app);
			const logTypeOk = isAservice ? logService && (client.logServiceName == 'All' || client.logServiceName == msg.name) : logServer;
			if(client.connection) {
				if(isLogFileName && logTypeOk && (logger.getLogLevelList()[msg.level] & client.logMask))
					client.connection.send(JSON.stringify(msg));
			}
		}
	}
}
module.exports = LogServer;