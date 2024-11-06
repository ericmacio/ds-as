const fsp = require('fs').promises;
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'logsController');

exports.getLogs = async (req, res, next) => {
    const caller = 'getLogs';
	try {
        //Get log files list
        const logDir = logger.getLogDir();
        const logFileName = logger.getLogFileName();
        const logFileList = await fsp.readdir(logDir);
        res.status(200).send({ok: true, error: null, data: { logFileList, logDir, logFileName }});
	} catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: fsp.readdir failed');
        logger.error(caller, error);
		res.status(400).send({ok: false, error: {msg: 'Cannot get logs. Error: ' + error}});
	}
}
exports.getLog = async (req, res, next) => {
    const caller = 'getLog';
    //Get logFileName from request
    const logFilePath = logger.getLogDir() + req.params['logFileName'];
    try {
        var logFileData = await fsp.readFile(logFilePath, 'utf8');
        res.status(200).send({ok: true, error: null, data: logFileData});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: fsp.readFile failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot get log file: ' + logFilePath + '. Error: ' + error}});
    }
}