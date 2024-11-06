var App = require('../src/apps/App');
const app = 'NewAppTest';
/*--------------------------------------------------------------------------------------------
		NewAppTest
---------------------------------------------------------------------------------------------*/
class NewAppTest extends App {
	constructor(data, proxy) {
        super(data, proxy);
    }
	//Start service
	async start() {
		var caller = 'start';
		this.logger.log(caller, 'INFO0', 'TEST2 NewAppTest running ...');
		return {ok: true};
	};
	//End service
	async stop() {
		var caller = 'stop';
		this.logger.log(caller, 'INFO0', 'TEST2 NewAppTest stopping ...');
		return {ok: true};
	}
}
module.exports = NewAppTest;