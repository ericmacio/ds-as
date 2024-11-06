const App = require('../src/apps/App');
const exportPath = 'appsData/updateVar/';
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'UpdateVar');
/*--------------------------------------------------------------------------------------------
		UpdateVar
---------------------------------------------------------------------------------------------*/
class UpdateVar extends App {
	constructor(data, proxy) {
        super(data, proxy);
		this.fileExportPath = exportPath + 'export_' + this.name + '.json';
    }
	//Start service
	async start() {
		var caller = 'start';
		logger.log(caller, 'INFO0', 'UpdateVar starting ...');
		//Check XLS dataConnector have been created
		if(!this.dataConnectorList.Xls1) {
            logger.log(caller, 'ERROR', 'ERROR: dataConnectorList.Xls1 is undefined');
            this.status = 'error';
            throw new Error('DataConnector has not been created. Check configuration file');
        }
		//Get sheet data
        try {
            let result = await this.dataConnectorList.Xls1.read();
            if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: xlsDataConnector.read result is ko');
                return {ok: false};
			}
			var data = result.data;
            logger.log(caller, 'INFO1', JSON.stringify(data));
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: xlsDataConnector.read failed');
            logger.error(caller, error);
            return {ok: false};
		}
		for(var id=0; id<data.length; id++) {
			for(var key in data[id]) {
				//Update variable
				try {
					var variable = {name: key, value: data[id][key]};
					let result = await this.api.variable.modify(variable);
					if(!result.ok) {
						logger.log(caller, 'DEBUG', 'ERROR: api.variable.modify result is ko');
						return {ok: false};
					}
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: api.variable.modify failed');
					logger.error(caller, error);
					return {ok: false};
				}
			}
		}
		logger.log(caller, 'INFO0', 'Variables update completed');
		return {ok: true, data: {mustStop: true}};
	};
	//Stop service
	async stop() {
		var caller = 'stop';
		logger.log(caller, 'INFO0', 'UpdateVar stopping ...');
		return {ok: true};
	}
}
module.exports = UpdateVar;