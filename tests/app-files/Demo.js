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
        const playlistData = {name: this.config.playlist};
        await this.api.playlist.create(playlistData);
        logger.log(caller, 'INFO0', 'Playlist created: ' + playlistData.name);
        logger.log(caller, 'INFO0', 'MyTestApp running ...');
        return {ok: true};
	};
	//End service
	async stop() {
		var caller = 'stop';
		logger.log(caller, 'INFO0', 'MyTestApp stopping ...');
        const playlistData = {name: this.config.playlist};
        await this.api.playlist.delete(playlistData);
        logger.log(caller, 'INFO0', 'Playlist deleted: ' + playlistData.name);
		return {ok: true};
	}
}
module.exports = MyTestApp;