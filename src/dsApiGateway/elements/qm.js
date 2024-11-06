const Generic = require('./Generic.js');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'qm');
var TYPE = 'qm';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get profile. " + error);
	process.exit();
}
var CHECK_FREQ_SEC = 3;
var DEFAULT_TIMEOUT_SEC = 300;
var DEFAULT_MAX_DELAY_SEC = 60;
/*--------------------------------------------------------------------------------------------
		QM
---------------------------------------------------------------------------------------------*/
class QM {
	constructor(apiCore) {
        this.apiCore = apiCore;
        this.type = TYPE;
		this.profile = PROFILE;
		this.generic = new Generic(this.apiCore, this.type, this.profile, null);
	}
	async check(data) {
		var caller = 'check';
		var timeElapsed = 0;
		if(data.maxDelay)
			var maxDelay = data.maxDelay;
		else
			var maxDelay = DEFAULT_MAX_DELAY_SEC;
		if(data.timeOut)
			var timeOut = data.timeOut;
		else
			var timeOut = DEFAULT_TIMEOUT_SEC;
		this.checkQM = async() => {
			this.restart = async() => {
				logger.log(caller, 'INFO2', 'Restart');
				timeElapsed += CHECK_FREQ_SEC;
				logger.log(caller, 'DEBUG', 'timeElapsed: ' + timeElapsed);
				return new Promise(resolve => this.timer = setTimeout(() => {return resolve(this.checkQM());}, CHECK_FREQ_SEC * 1000));
			}
			//Get list of QMs
			try {
				let result = await this.list(data);
				if(!result.ok) {
					logger.log(caller, 'DEBUG', 'ERROR: list result is ko');
					return result;
				}
				var qmList = result.data;
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: list failed');
				return {ok: false};
			}
			logger.log(caller, 'INFO2', 'list successful');
			logger.log(caller, 'INFO1', 'qmList length: ' + qmList.length);
			//Parse all existing QM to see if one matches
			var checkOk = true;
			var found = false;
			if(qmList.length == 0)
				logger.log(caller, 'WARNING', 'WARNING: No QM found');
			for(var id=0; id<qmList.length; id++) {
				//First check if QM has been generated during the last minute
				var date = new Date();
				var timeMs = date - qmList[id].date;
				logger.log(caller, 'DEBUG', 'Time(Ms): ' + timeMs);
				if(timeMs < (maxDelay*1000)) {
					found = true;
					//Check all criteria are met for this QM
					for(var key in data.check) {
						if(data.check[key] != qmList[id][key]) {
							//One criteria is not met. Let's skip this QM
							if((key != 'title') && (key != 'command'))
								logger.log(caller, 'WARNING', 'WARNING: QM[' + id + ']: ' + key + ': ' + qmList[id][key] + ', expected value: ' + data.check[key]);
							found = false;
							break;
						}
					}
				} else {
					//QM is too old. Skip it then
					logger.log(caller, 'INFO2', 'QM is out of date');
				}
				if(found) {
					//QM that meet all criteria has been found
					logger.log(caller, 'INFO1', 'Found QM for device ' + qmList[id].device + ', title: ' + qmList[id].title);
					logger.log(caller, 'INFO1', 'Time(Ms): ' + timeMs);
					break;
				}
			}
			if(!found && (timeElapsed < timeOut)) {
				//QM not found. Let's try again later
				logger.log(caller, 'INFO1', 'QM not found');
				return await this.restart();
			} else {
				if(timeElapsed >= timeOut) {
					//Retry unsuccessful. QM not found. Return error status
					logger.log(caller, 'ERROR', 'ERROR: Timeout expired (' + timeOut + '). QM not received');
					checkOk = false;
				}
				//Return final status
				return {ok: checkOk};
			}
		}
		//Start checking QM
		return await this.checkQM();
	}
	async deleteAll(data) {
		var caller = 'deleteAll';
		if(!data.device) {
			logger.log(caller, 'ERROR', 'ERROR: data.device is undefined');
			throw new Error('No device specified');
		}
		//Get list of QMs
		try {
			let result = await this.list(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: list result is ko');
				return result;
			}
			var qmList = result.data.filter((qm) => (qm.device == data.device));
			logger.log(caller, 'INFO1', 'qmList: ' + JSON.stringify(qmList));
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: list failed');
			logger.error(caller, error);
			return {ok: false};
		}
		this.deleteQM = async(qm) => {
			var urlPath = '/' + qm.id;
			logger.log(caller, 'INFO1', 'Deleting QM id: ' + qm.id);
			var headers = {}, sentData, sentForm;
			var cmd = this.profile.cmdList[this.profile.cmd.delete];
			try {
				let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
				if(!result.ok)
					logger.log(caller, 'DEBUG', 'ERROR: layout.getId result is ko');
				return result;
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
				return {ok: false};
			}
		}
		logger.log(caller, 'INFO2', 'qmList.length: ' + qmList.length);
		if(qmList.length > 0) {
			var deleteQmFunct = qmList.map((qm) => this.deleteQM(qm));
			try {
				const resultList = await Promise.all(deleteQmFunct);
				logger.log(caller, 'INFO2', 'Init resultList length: ' + resultList.length);
				//Now check the global status and return if error
				var allOk = true;
				for(let id=0; id<resultList.length; id++) {
					if(!resultList[id].ok) {
						logger.log(caller, 'ERROR', 'ERROR: result is ko for id: ' + id + ', result: ' + resultList[id].ok); 
						allOk = false;
					}
				}
				return {ok: allOk};
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for deleteQmFunct. ' + error);
				logger.error(caller, error);
				return {ok: false};
			}
		} else {
			logger.log(caller, 'INFO1', 'QM list is empty');
			return {ok: true};
		}
	}
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); return {ok: false};})};
}
module.exports = QM;