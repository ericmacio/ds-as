const App = require('../src/apps/App');
const ScrapData = require('../src/utils/ScrapData');
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'Scrap');
/*--------------------------------------------------------------------------------------------
		Scrap
---------------------------------------------------------------------------------------------*/
class Scrap extends App {
	constructor(data, proxy) {
        super(data, proxy);
    }
	//Start service
	async start() {
		var caller = 'start';
		logger.log(caller, 'INFO0', 'Scrap running ...');
		this.scrapData = new ScrapData(this.config.page);
		try {
			var result = await this.scrapData.getData();
		} catch (error) {
			logger.log(caller, 'ERROR', 'ERROR: scrapData.getData failed');
			logger.error(caller, error);
			return {ok: false};
		}
		if(result.ok) {
			var data = [];
			for(let id=0; id<this.config.nbItems; id++)
				data[id] = {};
			logger.log(caller, 'INFO1', 'data length: ' + result.data.length);
			for(let itemId=0; itemId<result.data.length; itemId++) {
				logger.log(caller, 'INFO2', 'data item length: ' + result.data[itemId].value.length);
				for(let id=0; id<this.config.nbItems; id++) {
					logger.log(caller, 'INFO2', result.data[itemId].name + '[' + id + ']: ' + result.data[itemId].value[id]);
					data[id][result.data[itemId].name] = result.data[itemId].value[id];
				}
			}
			for(let id=0; id<data.length; id++) {
				for(let key in data[id])
					logger.log(caller, 'INFO0', key + '[' + id + ']' + ': ' + data[id][key]);
			}
			logger.log(caller, 'INFO0', 'Extract completed');
		} else
			logger.log(caller, 'ERROR', 'ERROR: scrapData.getData result is ko');
		return (result);
	};
	//End service
	async stop() {
		var caller = 'stop';
		logger.log(caller, 'INFO0', 'Scrap stopping ...');
		this.scrapData.stop();
		return {ok: true};
	}
}
module.exports = Scrap;