const webSocketServer = require('ws').Server;
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'EventServer');
/*--------------------------------------------------------------------------------------------
		EventServer
---------------------------------------------------------------------------------------------*/
class EventServer {
	constructor(name, wsPort) {
		var caller = "EventServer";
		this.name = name;
		this.wsPort = wsPort;
		this.notifyClientList = [];
	}
	// server
	start() {
		//Create web socket server
		var caller = "start";
		var wsServer = new webSocketServer({port: this.wsPort});
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
							var clientData = msg.data;
							logger.log(caller, 'DEBUG', 'Notify client data: ' + JSON.stringify(clientData));
							const notifyClient = {
								clientId: this.notifyClientList.length
							};
							this.notifyClientList.push(notifyClient);
							var date = new Date();
							var msec = date.getMilliseconds();
							if(msec<10) msec = "0" + msec;
							var respMsg = {
								type: 'helloResponse',
								level: 'INFO0',
								text: 'Connected to remote event server',
								clientId: notifyClient.clientId,
								app: 'EventServer',
								date: date.toLocaleDateString(),
								time: date.toLocaleTimeString() + ":" + msec,
								file: __filename,
								caller: caller
							}
							connection.clientId = notifyClient.clientId;
							this.notifyClientList[notifyClient.clientId].connection = connection;
							//Send Hello response message to the ws client
							connection.send(JSON.stringify(respMsg));
							logger.log(caller, 'INFO0', 'New client connected to event server [' + this.name + ']. clientId: ' + notifyClient.clientId);
							break;
						default:
							logger.log(caller, 'WARNING', 'WARNING: Undefined msg type: ' + msg.type);
							break;
					}
				}
			});
			connection.on('close', () => {
				for(var id=0 ;id<this.notifyClientList.length; id++) {
					if(this.notifyClientList[id].clientId == connection.clientId) {
						//Remove client from table
						this.notifyClientList.splice(id,1);
						logger.log(caller, 'INFO0', 'Connection closed on event server [' + this.name + ']. Client id: ' + connection.clientId);
						break;
					}
				}
			});
		});
		logger.log(caller, 'INFO0', 'EventServer ' + this.name + ' started on port: ' + this.wsPort);
	}
	// sendMsgToClient
	sendMsgToClient(msg) {
		var caller = "sendMsgToClient";
		logger.log(caller, 'DEBUG', 'sendMsgToClient: ' + JSON.stringify(msg));
		for(var id=0; id<this.notifyClientList.length; id++) {
			var client = this.notifyClientList[id];
			if(client.connection) {
				logger.log(caller, 'DEBUG', 'send msg to client, id: ' + id + ', msg: ' + JSON.stringify(msg));
				client.connection.send(JSON.stringify(msg));
			}
		}
	}
}
module.exports = EventServer;