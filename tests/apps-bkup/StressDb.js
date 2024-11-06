const App = require('../src/apps/App');
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'StressDb');
/*--------------------------------------------------------------------------------------------
		StressDb
---------------------------------------------------------------------------------------------*/
class StressDb extends App {
	constructor(data, proxy) {
        super(data, proxy);
		this.dbClientList = [];
	}
	//Start service
	start = async() => {
		var caller = 'start';
		for(let key in this.dataConnectorList) {
			let localKey = key;
			for(let id=0; id<this.config.nbClient; id++) {
				var dbClient = new DbClient(localKey, id, this.dataConnectorList[key], this.config.timerMs, this.onError.bind(this));
				this.dbClientList.push(dbClient);
				try {
					let result = await dbClient.start();
					if(!result.ok)
						logger.log(caller, 'ERROR', 'ERROR: dbClient.start failed');
					else
						logger.log(caller, 'INFO2', 'dbclient id ' + id + ' has been started');
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: dbClient failed');
					this.notifyStatus('error');
				}
			}
		}
		return {ok: true};
	}
	//End service
	stop() {
		var caller = 'stop';
		logger.log(caller, 'INFO0', 'Service is stopping ...');
		this.dbClientList.forEach((dbClient) => {
			dbClient.stop();
			logger.log(caller, 'INFO0', 'dbClient stopped, key: ' + dbClient.key + ', id: ' + dbClient.id);
		});
		return {ok: true};
	}
	onError(error) {
		const caller = 'onError';
		this.stop();
		logger.log(caller, 'ERROR', 'ERROR: Client reported error during execution: ' + error.msg);
		//Notify web clients
		this.notifyStatus('error');
	}
}
/*--------------------------------------------------------------------------------------------
		DbClient
---------------------------------------------------------------------------------------------*/
class DbClient {
	constructor(key, id, dataConnector, timerMs, onError) {
		var caller = 'DbClient';
		this.key = key;
		this.id = id;
		this.dbDdataConnector = dataConnector;
		this.timerMs = timerMs;
		this.mustRun = true;
		this.logger = logger;
		this.onError = onError;
		this.first = true;
		logger.log(caller, 'INFO2', 'New DbClient created for key: ' + this.key + ', id: ' + this.id);
	}
	//Start service
	start = async() => {
		var caller = 'start';
		//First check XLS file exists
		if(this.mustRun) {
			try {
				let result = await this.dbDdataConnector.access();
				if(!result.ok) {
					logger.log(caller, 'ERROR', 'ERROR: dbDdataConnector.access result is ko');
					throw new Error('Fatal error when accessing data. Stop');
				}
				var scanData = result.data;
				logger.log(caller, 'DEBUG', 'scanData: ' + JSON.stringify(scanData));
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: dbDdataConnector.access failed');
				if(this.first) {
					this.first = false;
					return {ok: false};
				} else
					this.onError({msg: 'Fatal error'});
			}
		}
		if(this.mustRun) {
			try {
				let result = await this.dbDdataConnector.fileTime();
				if(!result.ok) {
					logger.log(caller, 'ERROR', 'ERROR: dbDdataConnector.fileTime result is ko');
					throw new Error('Fatal error when getting file time. Stop');
				}
				var scanData = result.data;
				logger.log(caller, 'DEBUG', 'scanData: ' + JSON.stringify(scanData));
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: dbDdataConnector.fileTime failed');
				if(this.first) {
					this.first = false;
					return {ok: false};
				} else
					this.onError({msg: 'Fatal error'});
			}
		}
		if(this.mustRun) {
			try {
				let result = await this.dbDdataConnector.read();
				if(!result.ok) {
					logger.log(caller, 'ERROR', 'ERROR: dbDdataConnector.read result is ko');
					throw new Error('Fatal error when reading data. Stop');
				}
				var scanData = result.data;
				logger.log(caller, 'DEBUG', 'scanData: ' + JSON.stringify(scanData));
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: dbDdataConnector.read failed');
				if(this.first) {
					this.first = false;
					return {ok: false};
				} else
					this.onError({msg: 'Fatal error'});
			}
		}
		if(this.mustRun) {
			this.timeout = setTimeout(() => {this.start();}, this.timerMs);
			logger.log(caller, 'INFO0', 'Loop ok for ' + this.key + ', id: ' + this.id);
		}
		if(this.first) {
			this.first = false;
			return {ok: true};
		}
	}
	stop() {
		this.mustRun = false;
		if(this.timeout)
			clearTimeout(this.timeout);
	}
}
module.exports = StressDb;