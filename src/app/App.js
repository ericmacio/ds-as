const DataConnectors = require('../dataConnectors');
const DsApiGateway = require('../dsApiGateway/DsApiGateway');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'App');
/*--------------------------------------------------------------------------------------------
		App
---------------------------------------------------------------------------------------------*/
class App {
	constructor(serviceData, proxy) {
		var caller = 'App';
		logger.log(caller, 'DEBUG', 'New App ' + serviceData.app + ' for service ' + serviceData.name);
		this.serviceData = serviceData;
		this.serviceId = serviceData.id;
		this.appName = serviceData.app;
		this.name = serviceData.name;
		this.config = serviceData.configData;
		this.serverData = {user: serviceData.user, password: serviceData.password, apiUrl: serviceData.apiUrl, apiPort: serviceData.apiPort};
		this.proxy = proxy;
		this.isConnected = false;
		this.dataConnectorList = new Object();
		this.dsApiGateway = new DsApiGateway(this.serverData);
		this.api = {}; //Will be set later
	}
	setStatusNotifier(statusNotifier) {
		const caller = 'setStatusNotifier';
		this.notifyStatus = statusNotifier;
	}
	//Set service data
	setService(serviceData) {
		const caller = 'setService';
		logger.log(caller, 'INFO2', 'Set service: ' + serviceData.name);
		this.serviceData = serviceData;
		this.appName = serviceData.app;
		this.name = serviceData.name;
		this.config = serviceData.configData;
		this.serverData = {user: serviceData.user, password: serviceData.password, apiUrl: serviceData.apiUrl, apiPort: serviceData.apiPort};
	}
	//init. Will be called whenever service is started
	init = async() => {
		var caller = 'init';
		logger.log(caller, 'INFO1', 'Init ' + this.appName + ' service: ' + this.name);
		//Check if need to connect to server
		logger.log(caller, 'DEBUG', 'user: ' + this.serverData.user);
		if(!this.serverData.user || (this.serverData.user == '') || (this.serverData.user == 'null'))
			logger.log(caller, 'INFO0', 'No login for this service');
		else {
			logger.log(caller, 'INFO0', 'Connecting to server ...');
			//Get API entry points from API gateway
			try {
				let result = await this.dsApiGateway.getApi();
				if(!result.ok) {
					logger.log(caller, 'DEBUG', 'ERROR: server.getApi result is ko for service ' + this.name);
					return result;
				} else
					this.api = result.data;
			} catch(error) {
				logger.log(caller, 'ERROR', 'server.getApi failed');
				logger.error(caller, error);
				return {ok: false}
			}
			//Connect to the server.
			try {
				let result = await this.dsApiGateway.connect();
				if(!result.ok) {
					logger.log(caller, 'DEBUG', 'ERROR: server.connect result is ko for service ' + this.name);
					return result;
				} else {
					//We are connected to the Piksel DS server
					this.isConnected = true;
					logger.log(caller, 'INFO0', 'Service ' + this.name + ' connected to ' + this.dsApiGateway.getUrl());
				}
			} catch(error) {
				logger.log(caller, 'ERROR', 'server.connect failed');
				logger.error(caller, error);
				return {ok: false}
			}
		}
		//Create DataConnector for this service if need be
		try {
			let result = await this.createDataConnectors();
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: createDataConnectors result is ko');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: createDataConnectors failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//shutdown. Will be called whenever service is stopped
	shutdown = async() => {
		var caller = 'shutdown';
		logger.log(caller, 'INFO1', 'Shutdown ' + this.appName + ' service: ' + this.name);
		try {
			var result = await this.deleteDataConnectors();
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: deleteDataConnectors result is ko'); 
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: deleteDataConnectors failed');
			return {ok: false};
		}
		if(this.isConnected) {
			//Disconnect from the server.
			try {
				let result = await this.dsApiGateway.disConnect();
				if(!result.ok)
					logger.log(caller, 'DEBUG', 'ERROR: server.disConnect result is ko for ' + this.name);
				else {
					//We are disconnected to the Piksel DS server
					this.isConnected = false;
					logger.log(caller, 'INFO0', 'Service ' + this.name + ' disconnected from ' + this.dsApiGateway.getUrl());
				}
				return result;
			} catch(error) {
				logger.log(caller, 'ERROR', 'server.disConnect failed');
				return {ok: false}
			}
		} else {
			logger.log(caller, 'INFO0', 'Not connected to server. No need to disconnect then');
			return {ok: true};
		}
	}
	//createDataConnectors
	createDataConnectors = async() => {
		var caller = 'createDataConnectors';
		if(this.config.dataConnectors) {
			logger.log(caller, 'INFO2', 'Create dataConnectors for service: ' + this.name);
			var getDataConnectorsFunct = [];
			for(var key in this.config.dataConnectors)
				getDataConnectorsFunct.push(this.createDataConnector(key));
			try {
				const resultList = await Promise.all(getDataConnectorsFunct);
				//Now check the global status
				const allOk = resultList.find(result => !result.ok) ? false : true;
				return {ok: allOk};
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for getDataConnectorsFunct. ' + error);
				logger.error(caller, error);
				return {ok: false};
			}
		} else {
			logger.log(caller, 'INFO2', 'No dataConnectors for service: ' + this.name);
			return {ok: true};
		}
	}
	//createDataConnector
	createDataConnector = async(key) => {
		const caller = 'createDataConnector';
		var config = this.config.dataConnectors[key];
		//Check DataConnector exists
		if(!DataConnectors[config.type]) {
			logger.log(caller, 'ERROR', 'ERROR: dataConnector does not exist: ' + config.type);
			throw new Error('cannot create dataConnector');
		}
		logger.log(caller, 'DEBUG', 'createDataConnector for key ' + key);
		//Create new DataConnector of type config.type. Pass it the proxy so that it can create remote agent if need be
		var dataConnector = new DataConnectors[config.type](this.name, key, config, this.proxy);
		//Connect the dataConnector
		//If access is remote the proxy will create the link with the according dataConnector agent
		//Otherwise it will give direct access to the resource
		try {
			let result = await dataConnector.connect();
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: dataConnector.connect result is ko');
				return result;
			}
			//Put it in the list once connected
			this.dataConnectorList[key] = dataConnector;
			return {ok: true};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: dataConnector.connect failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//deleteDataConnectors
	deleteDataConnectors = async() => {
		const caller = 'deleteDataConnectors';
		var nbDataCollector = Object.keys(this.dataConnectorList).length;
		if(this.dataConnectorList && (nbDataCollector > 0)) {
			var deleteDataConnectorFunct = [];
			for(var key in this.config.dataConnectors)
				deleteDataConnectorFunct.push(this.deleteDataConnector(key));
			try {
				const resultList = await Promise.all(deleteDataConnectorFunct);
				//Now check the global status
				const allOk = resultList.find(result => !result.ok) ? false : true;
				return {ok: allOk};
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for deleteDataConnectorFunct. ' + error);
				logger.error(caller, error);
				return {ok: false};
			}
		} else
			return {ok: true};
	}
	//deleteDataConnector
	deleteDataConnector = async(key) => {
		const caller = 'deleteDataConnector';
		var dataConnector = this.dataConnectorList[key];
		//Disconnect the dataConnector
		//If access is remote the proxy will delete the link with the according dataConnector agent
		try {
			let result = await dataConnector.close();
			delete this.dataConnectorList[key];
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: dataConnector.close result is ko');
				return result;
			}
			return {ok: true, data: { key }};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: dataConnector.close failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	getServiceId() {
		return this.serviceId;
	}
	getName() {
		return this.appName;
	}
	//Get owner
	getOwner() {
        const caller = 'getOwner';
        return this.serviceData.owner;
    }
    //Get scope
	getScope() {
        const caller = 'getScope';
        return this.serviceData.scope;
    }
     //Get serviceData
	getServiceData() {
        const caller = 'getServiceData';
        return this.serviceData;
    }
}
module.exports = App;