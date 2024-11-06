const App = require('../src/app/App');
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'Devices');
/*--------------------------------------------------------------------------------------------
		Devices
---------------------------------------------------------------------------------------------*/
class Devices extends App {
	constructor(data, proxy) {
        super(data, proxy);
    }
	//Start service
	async start() {
		var caller = 'start';
		this.wait = async(timeoutSec) => {
			return new Promise((resolve) => {this.timeOut = setTimeout(() => {resolve()}, timeoutSec * 1000)});
		}
		this.mustStop = false;
		var statusOk = true;
		while(!this.mustStop && statusOk) {
			try {
				let result = await this.api.device.list();
				if(!result.ok) {
					logger.log(caller, 'DEBUG', 'ERROR: api.device.list result is ko');
					statusOk = false;
				} else {
					var display = this.config.display;
					result.data.forEach((device) => {
						logger.log(caller, 'INFO0', '---------------------------');
						for(var key in device) {
							if(display && (display.indexOf(key) >= 0))
								logger.log(caller, 'INFO0', key + ': ' + JSON.stringify(device[key]));
						}
					});
					if(!this.mustStop){
						await this.wait(this.config.timerSec);
						this.timeOut = null;
					}
				}
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: api.device.list failed');
				statusOk = false;
			}
		}
		return {ok: statusOk};
	};
	//Stop service
	async stop() {
		var caller = 'stop';
		this.mustStop = true;
		if(this.timeOut) clearTimeout(this.timeOut);
		return {ok: true};
	}
}
module.exports = Devices;