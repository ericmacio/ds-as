const fsp = require('fs').promises;
const LOG_LEVEL_LIST = {ERROR: "0x01", WARNING: "0x02", INFO0: "0x04", INFO1: "0x08", INFO2: "0x10", DEBUG: "0x80"};
const LOG_MASK_LIST = {ERROR: "0x01", WARNING: "0x03", INFO0: "0x07", INFO1: "0x0F", INFO2: "0x1F", DEBUG: "0xFF"};
const LogConfig = require('../../config/logger.json');
var logServer;
var logFilesList = [];
/*--------------------------------------------------------------------------------------------
		Logger
---------------------------------------------------------------------------------------------*/
class Logger {
	constructor(file, app, logConfig, logServerInstance) {
		const caller = 'logger';
		this.file = file;
		this.app = app;
		this.logToFile = logConfig && logConfig.logToFile ? logConfig.logToFile : LogConfig.logToFile;
		this.logDir = logConfig && logConfig.logDir ? logConfig.logDir : LogConfig.logDir;
		this.logFileName = logConfig && logConfig.logFileName ? logConfig.logFileName : LogConfig.logFileName;
		this.logFilePath = this.logDir + this.logFileName;
		this.maxLogSizeKo = logConfig && logConfig.maxLogSizeKo ? logConfig.maxLogSizeKo : LogConfig.maxLogSizeKo;
		this.checkTimerSec = LogConfig.checkTimerSec;
		this.logLevel = logConfig && logConfig.logLevel ? logConfig.logLevel : LogConfig.logLevel[app] ? LogConfig.logLevel[app] : LogConfig.logLevel['default'];
		this.logMask = LOG_MASK_LIST[this.logLevel];
		this.checkTimer = null;
		if(this.logToFile) {
			//Check if log file name is already in table
			var found = false;
			for(let id=0; id<logFilesList.length; id++) {
				if(logFilesList[id].logFilePath == this.logFilePath) {
					found = true;
					break;
				}
			}
			if(!found) {
				//logFilePath is unknown. Add a new entry in log files table
				this.log(caller, 'INFO0', 'New log file added to table: ' + this.logFilePath);
				logFilesList.push({
					logToFile: this.logToFile,
					logDir: this.logDir,
					logFileName: this.logFileName,
					logFilePath: this.logFilePath,
					maxLogSizeKo: this.maxLogSizeKo,
					checkTimerSec: this.checkTimerSec
				});
			}
		}
		//Create logger serverShared among all instances of logger class. It will provide the console with remote access to all logs
		if(logServerInstance) {
			logServer = logServerInstance;
			//start logServer
			logServer.start();
		}
	}
	//getDate
	getDate() {
		var date = new Date;
		var msec = date.getMilliseconds();
		if(msec<10) msec = "0" + msec;
		return (date.toLocaleString() + ":" + msec);
	}
	//log
	log(caller, level, msg) {
		this.logStdOutAndFile = async(level, msg) => {
			if(this.logMask & LOG_LEVEL_LIST[level]) {
				console.log(msg);
				if(this.logToFile) {
					try {
						fsp.appendFile(this.logFilePath, msg + "\n");
					} catch(error) {
						console.log('ERROR: fsp.appendFile failed: ' + error);
					}
				}
			}
		}
		var date = new Date;
		var msec = date.getMilliseconds();
		if(msec<10) msec = "0" + msec;
		//const logText = this.getDate() + " [" + this.app + "]" + "[" + this.file + "]" + "[" + caller + "]: " + msg;
		const logText = this.getDate() + " [" + this.file + "]" + "[" + this.app + "]" + "[" + caller + "]: " + msg;
		this.logStdOutAndFile(level, logText);
		//Callback logserver with logMsg to be sent to all logServer clients
		if(logServer) {
			const logMsg = {
				type: 'LogMessage',
				level: level,
				date: date.toLocaleDateString(),
				time: date.toLocaleTimeString() + ":" + msec,
				file: this.file,
				caller: caller,
				app: this.app,
				text: msg
			}
			logServer.sendMsgToClient(logMsg, this.logFileName);
		}
	}
	startCheckLogSize = async() => {
		const caller = 'startCheckLogSize';
		this.checkFunct = async(logFile) => {
			if(logFile.logToFile) {
				this.log(caller, 'INFO2', 'Checking log file: ' + logFile.logFilePath);
				let mustRenew = false;
				try {
					const stats =  await fsp.stat(logFile.logFilePath);
					const fileSizeInKiloBytes = stats.size / (1024);
					if(fileSizeInKiloBytes > logFile.maxLogSizeKo) {
						this.log(caller, 'INFO2', 'Max size reached: ' + fileSizeInKiloBytes + ' Ko');
						mustRenew = true;
					}
				} catch(error) {
					this.log(caller, 'ERROR', 'ERROR: fsp.stat failed');
					this.error(caller, error);
					return {ok: false};
				}
				if(mustRenew) {
					this.log(caller, 'INFO2', 'We must renew the log file');
					const name = logFile.logFileName.split('.')[0];
					const ext = logFile.logFileName.split('.')[1];
					let maxId = 0;
					try {
						//Get file list
						const fileList = await fsp.readdir(logFile.logDir);
						const logFileList = fileList.filter(file => file.includes(name + '-'));
						this.log(caller, 'DEBUG', 'logFileList length: ' + logFileList.length);
						for(let id=0; id<logFileList.length; id++) {
							const fileId = logFileList[id].split('-')[1].split('.')[0];
							this.log(caller, 'DEBUG', 'fileId: ' + fileId);
							if(fileId > maxId) maxId = parseInt(fileId);
						}
					} catch(error) {
						this.log(caller, 'ERROR', 'ERROR: fsp.readDir failed');
						this.error(caller, error);
						return {ok: false};
					}
					const newId = maxId + 1;
					const newLogFileName = name + '-' + newId + '.' + ext;
					//Rename the current log file
					try {
						await fsp.rename(logFile.logFilePath, logFile.logDir + newLogFileName);
					} catch(error) {
						this.log(caller, 'ERROR', 'ERROR: fsp.rename failed');
						this.error(caller, error);
						return {ok: false};
					}
					//Create new empty file. Open it and close it just afterwards
					try {
						await fsp.appendFile(logFile.logFilePath, 'New file created\n');
					} catch(error) {
						this.log(caller, 'ERROR', 'ERROR: fsp.appendFile failed');
						this.error(caller, error);
						return {ok: false};
					}
					this.log(caller, 'INFO0', 'Log file ' + logFile.logFilePath + ' renamed to ' + newLogFileName);
				} else
					return {ok: true};
			}
			return {ok: true};
		}
		this.checkAllLogFile = async() => {
			const checkFunctArray = logFilesList.map(logFile => {return this.checkFunct(logFile);});
			try {
				const resultList = await Promise.all(checkFunctArray);
				//Now check the global status
				let allOk = resultList.find(result => !result.ok) ? false : true;
				if(!allOk)
					this.log(caller, 'ERROR', 'ERROR: checkFunctArray result is ko')
			} catch(error) {
				this.log(caller, 'ERROR', 'ERROR: Promise.all failed for checkFunctArray');
				this.error(caller, error);
			}
			this.checkTimer = setTimeout(() => {this.checkAllLogFile();}, this.checkTimerSec * 1000);
		}
		this.checkAllLogFile();
	}
	stopCheckLogSize() {
		clearTimeout(this.checkTimer);
	}
	error(caller, error, msg) {
		this.log(caller, 'ERROR', 'ERROR: System error has been catched');
		if(msg) this.log(caller, 'ERROR', msg);
		const logMsg = 'ERROR: ' + error.stack;
		this.log(caller, 'ERROR', logMsg);
	}
	//getLogLevelList
	getLogLevelList() {
		return LOG_LEVEL_LIST;
	}
	//getLogMaskList
	getLogMaskList() {
		return LOG_MASK_LIST;
	}
	//getLogDir
	getLogDir() {
		return this.logDir;
	}
	//getLogDir
	getLogFileName() {
		return this.logFileName;
	}
	//getLogDir
	getLogFilesList() {
		return logFilesList;
	}
}
module.exports = Logger;