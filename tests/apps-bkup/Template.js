var App = require('../src/apps/App');
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'Template');
/*--------------------------------------------------------------------------------------------
		Template
---------------------------------------------------------------------------------------------*/
class Template extends App {
	constructor(data, proxy) {
        super(data, proxy);
    }
	//Start service
	async start() {
		var caller = 'start';
		logger.log(caller, 'INFO0', 'Template running ...');
		return {ok: true};
	};
	//End service
	async stop() {
		var caller = 'stop';
		logger.log(caller, 'INFO0', 'Template stopping ...');
		return {ok: true};
	}
}
module.exports = Template;