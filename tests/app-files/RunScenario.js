const App = require('../src/app/App');
var Scenario = require('../src/utils/Scenario');
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'RunScenario');
/*--------------------------------------------------------------------------------------------
		RunScenario
---------------------------------------------------------------------------------------------*/
class RunScenario extends App {
	constructor(data, proxy) {
        super(data, proxy);
    }
    async start() {
		const caller = 'start';
		//Check scenario list exist
		if(!this.config.scenarioList) {
			logger.log(caller, 'ERROR', 'ERROR: scenarioList is missing in config file');
			return {ok: false};
		}
		const wait_loop_ms = this.config.wait_loop_ms ? this.config.wait_loop_ms : 0;
		const wait_task_ms = this.config.wait_task_ms ? this.config.wait_task_ms : 0;
		this.scenario = new Scenario(this.api, wait_loop_ms, wait_task_ms);
		logger.log(caller, 'INFO1', 'Scenario list length: ' + this.config.scenarioList.length);
		//Build scenario task list
		for(var id=0; id<this.config.scenarioList.length; id++) {
			if(this.config[this.config.scenarioList[id]])
				this.scenario.add(this.config[this.config.scenarioList[id]]);
			else
				logger.log(caller, 'ERROR', 'ERROR: Scenario not found in config file: ' + this.config.scenarioList[id]);
		}
		//Start the scenarii
		try {
			let result = await this.scenario.start();
			if(!result.ok) {
				logger.log(caller, 'ERROR', 'ERROR: scenario.start result is ko');
				return result;
			}
			//We must stop the service right after its execution for a later restart
			return {ok: true, data: {mustStop: result.data.mustStop}};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: scenario.start failed');
			logger.error(caller, error);
			logger.log(caller, 'ERROR', '>>>> End: FATAL ERROR');
			return {ok: false};
		}
    }
    async stop() {
        const caller = 'stop';
		//Scenario will stop later when current running task has been completed
		try {
			let result = await this.scenario.stop();
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: scenario.stop result is ko');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: scenario.stop failed');
			return {ok: false};
		}
    }
}
module.exports = RunScenario;