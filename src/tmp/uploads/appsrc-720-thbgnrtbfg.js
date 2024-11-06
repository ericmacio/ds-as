var App = require('../src/app/App');
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'MyTestApp');
/*--------------------------------------------------------------------------------------------
		MyTestApp
---------------------------------------------------------------------------------------------*/
class MyTestApp extends App {
	constructor(data, proxy) {
        super(data, proxy);
    }
	//Start service
	async start() {
		var caller = 'start';
		logger.log(caller, 'INFO0', 'MyTestApp running ...');
        const channelData = {name: 'myChannel'};
        this.api.channel.create(channelData);
        logger.log(caller, 'INFO0', 'Channel created: ' + channelData.name);
		return {ok: true};
	};
	//End service
	async stop() {
		var caller = 'stop';
		logger.log(caller, 'INFO0', 'MyTestApp stopping ...');
        const channelData = {name: 'myChannel'};
        this.api.channel.delete(channelData);
        logger.log(caller, 'INFO0', 'Channel delete: ' + channelData.name);
		return {ok: true};
	}
}
module.exports = MyTestApp;