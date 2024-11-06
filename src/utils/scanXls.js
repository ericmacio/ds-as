var fs = require('fs');
var util = require('util');
var path = require('path');
var Logger = require('../logging/logger');
var logger = new Logger(__filename, 'scanXls');
const exportDir = 'appsData/DbToSlide/Export';
const DEFAULT_SCAN_TIMER_SEC = 15;
const DEFAULT_FORCEONCHANGE = true;
const DEFAULT_PREFIX = 'SCANXLS_';
/*--------------------------------------------------------------------------------------------
		ScanXls
---------------------------------------------------------------------------------------------*/
class ScanXls {
    constructor(api, proxy, config, xlsDataConnector, onChange) {
        var caller = 'ScanXls';
        this.onChange = onChange
        this.api = api;
        this.proxy = proxy;
        this.config = config;
        this.xlsDataConnector = xlsDataConnector;
        this.mustStop = false;
        this.running = false;
        //Init file time
        var currDate = new Date();
        this.prevFileTime = currDate.getTime();
        if(this.xlsDataConnector) {
            if(this.xlsDataConnector.file) {
                this.prefix = (this.config.prefix) ? this.config.prefix : DEFAULT_PREFIX;
                logger.log(caller, 'DEBUG', 'Prefix: ' + this.prefix);
                this.fileExportFile = this.prefix + 'export_' + this.xlsDataConnector.sheet + '_' + path.basename(this.xlsDataConnector.file, '.xlsx') + '.json';
                this.fileExportPath = exportDir + '/' + this.fileExportFile;
                this.baseName = path.basename(this.xlsDataConnector.file);
                logger.log(caller, 'INFO2', 'fileExportPath: ' + this.fileExportPath);
                this.scanTimeSec = (this.config.scanTimeSec) ? this.config.scanTimeSec : DEFAULT_SCAN_TIMER_SEC;
                this.forceOnChange = (typeof(config.forceOnChange) != 'undefined') ? this.config.forceOnChange : DEFAULT_FORCEONCHANGE;
                this.forceFileTimeChanged = (typeof(config.forceFileTimeChanged) != 'undefined') ? this.config.forceFileTimeChanged : false;
                this.checkKeyList = (config.checkKeyList) ? this.config.checkKeyList : [];
            } else
                logger.log(caller, 'ERROR', 'ERROR: file to scan is undefined');
        } else
            logger.log(caller, 'ERROR', 'ERROR: xlsDataConnector is undefined');
    }
    async startService() {
        var caller = 'startService';
        logger.log(caller, 'INFO1', 'Scanning ' + this.baseName + ' [' + this.xlsDataConnector.sheet + '] ...' );
        //Wait function
        this.wait = async(timeoutSec) => {
			return new Promise((resolve) => {this.timeOut = setTimeout(() => {resolve()}, timeoutSec * 1000)});
		}
        //scanFile
        this.scanFile = async() => {
            var caller = 'scanFile';
            this.running = true;
            //getXlsContent
            this.getXlsContent = async(prevScanData) => {
                var caller = 'getXlsContent';
                logger.log(caller, 'DEBUG', 'prevScanData: ' + JSON.stringify(prevScanData));
                //Read excel xlsx file. Warning: may return empty rows and unordered columns ....
                try {
                    let result = await this.xlsDataConnector.read();
                    if(!result.ok) {
                        logger.log(caller, 'DEBUG', 'ERROR: xlsDataConnector.read result is ko');
                        return {ok: false};
                    }
                    var scanData = result.data;
                    logger.log(caller, 'DEBUG', 'scanData: ' + JSON.stringify(scanData));
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: xlsDataConnector.read failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                //Write file data into local file
                const writeFile = util.promisify(fs.writeFile);
                try {
                    await writeFile(this.fileExportPath, JSON.stringify(scanData));
                } catch(error) {
                    logger.log(caller, 'DEBUG', 'writeFile failed');
                    throw new Error('Cannot write data to local file');
                }
                //Init prevData to be deleted if not found
                for(var prevId=0; prevId<prevScanData.length; prevId++)
                    prevScanData[prevId].PRV_deleted = true;
                //Initialize global change status
                var hasChanged = false;
                //Compare new with previous data from XLS file
                for(var id=0; id<scanData.length; id++) {
                    scanData[id].PRV_new = true;
                    var prevId=0;
                    //Look at one entry that matches the previous data
                    while(scanData[id].PRV_new && (prevId<prevScanData.length)) {
                        //First check the previous entry has not been found yet. Allow to deal with double entry of db data
                        if(prevScanData[prevId].PRV_deleted) {
                            var found = true;
                            for(var key in scanData[id]) {
                                var keyToBeChecked = (this.checkKeyList.length == 0) || (this.checkKeyList.indexOf(key) >= 0);
                                if(keyToBeChecked && (scanData[id][key] != prevScanData[prevId][key])) {
                                    found = false;
                                    //Not matches
                                    break;
                                }
                            }
                            if(found) {
                                logger.log(caller, 'INFO2', 'Found id ' + id);
                                //One matched so set status accordingly
                                prevScanData[prevId].PRV_deleted = false;
                                scanData[id].PRV_new = false;
                                //Save prev id for this data
                                scanData[id].PRV_prevId = prevId;
                            }
                        }
                        //Check next
                        prevId++;
                    }
                    if(scanData[id].PRV_new) {
                        logger.log(caller, 'INFO2', 'Previous data not found for id: ' + id);
                        //At least one has changed or been removed. So set global status accordingly
                        hasChanged = true;
                    }
                }
                //Now check if some previous data just disapearred and set change flag accordingly
                for(var prevId=0; prevId<prevScanData.length; prevId++)
                    if(prevScanData[prevId].PRV_deleted)
                        hasChanged = true;
                //Return new and previous data as well as global change status
                return {ok: true, data: {scanData: scanData, prevScanData: prevScanData, hasChanged: hasChanged}};
            }
            logger.log(caller, 'INFO1', 'Scan file ...');
            logger.log(caller, 'INFO2', 'Scan XLS file: ' + this.xlsDataConnector.file);
            //Get last time of file modification
            try {
                let result = await this.xlsDataConnector.fileTime();
                if(!result.ok) {
                    logger.log(caller, 'DEBUG', 'ERROR: xlsDataConnector.fileTime result is ko');
                    return {ok: false};
                }
                var fileTime = result.data;
                logger.log(caller, 'INFO1', 'FileTime: ' + fileTime); 
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: xlsDataConnector.fileTime failed');
                logger.error(caller, error);
                return {ok: false};
            }
            //Check if database file has been modified
            if(this.forceFileTimeChanged || (fileTime > this.prevFileTime)) {
                //File has been modified so get new content
                logger.log(caller, 'INFO1', 'File has been updated. Sheet: ' + this.xlsDataConnector.sheet);
                this.prevFileTime = fileTime;
                //Check previous export file exists
                const access = util.promisify(fs.access);
                try {
                    await access(this.fileExportPath, fs.F_OK);
                    //Read previous XLS content from export file
                    const readFile = util.promisify(fs.readFile);
                    try {
                        var data = await readFile(this.fileExportPath);
                    } catch(error) {
                        logger.log(caller, 'DEBUG', 'readFile failed');
                        logger.error(caller, error);
                        return {ok: true};
                    }
                    try {
                        var prevExportData = JSON.parse(data);
                    } catch (err) {
                        logger.log(caller, 'ERROR', 'ERROR: JSON.parse failed: ' + err);
                        logger.log(caller, 'WARNING', 'WARNING: clear previous export data');
                        var prevExportData = [];
                    }
                } catch(error) {
                    logger.log(caller, 'WARNING', 'WARNING: File does not exist: ' + this.fileExportPath);
                    //Since no previous content exists initialize it to empty object
                    var prevExportData = [];
                } finally {
                    //Get new content
                    try {
                        let result = await this.getXlsContent(prevExportData);
                        if(!result.ok) {
                            logger.log(caller, 'DEBUG', 'ERROR: getXlsContent result is ko');
                            return {ok: false};
                        }
                        var scanData = result.data.scanData;
                        var prevScanData = result.data.prevScanData;
                        var hasChanged = result.data.hasChanged;
                    } catch(error) {
                        logger.log(caller, 'ERROR', 'ERROR: getXlsContent failed');
                        logger.error(caller, error);
                        return {ok: false};
                    }
                    logger.log(caller, 'DEBUG', 'hasChanged: ' + hasChanged + ', forceOnChange: ' + this.forceOnChange);
                    //Call back if change or force mode
                    if(hasChanged || this.forceOnChange) {
                        logger.log(caller, 'INFO2', 'Call onChange callback');
                        try {
                            let result = await this.onChange(scanData, prevScanData);
                            logger.log(caller, 'INFO1', 'onChange returned: ' + JSON.stringify(result));
                            if(!result.ok) {
                                logger.log(caller, 'DEBUG', 'ERROR: onChange result is ko');
                                return result;
                            }
                            return {ok: true};
                        } catch(error) {
                            logger.log(caller, 'ERROR', 'ERROR: onChange failed');
                            logger.error(caller, error);
                            return {ok: false};
                        }
                    } else {
                        logger.log(caller, 'INFO0', 'No change');
                        return {ok: true};
                    }
                }
            } else {
                logger.log(caller, 'INFO0', 'FileTime unchanged: ' + fileTime);
                return {ok: true};
            }
        }
        if(this.xlsDataConnector.file) {
            logger.log(caller, 'INFO2', 'ScanXls service started on file: ' + this.xlsDataConnector.file + ', sheet: ' + this.xlsDataConnector.sheet);
            //First check XLS file exists
            try {
                let result = await this.xlsDataConnector.access();
                if(!result.ok) {
                    logger.log(caller, 'DEBUG', 'ERROR: xlsDataConnector.access result is ko');
                    return {ok: false};
                }
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: xlsDataConnector.access failed');
                logger.error(caller, error);
                return {ok: false};
            }
            logger.log(caller, 'INFO0', 'Start scanning file ...');
            var statusOk = true;
            while(!this.mustStop && statusOk) {
                try {
                    let result = await this.scanFile();
                    logger.log(caller, 'INFO2', 'scanFile returned: ' + JSON.stringify(result));
                    if(!result.ok) {
                        logger.log(caller, 'DEBUG', 'ERROR: scanFile result is ko');
                        statusOk = false;
                    } else
                        await this.wait(this.scanTimeSec);
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: scanFile failed');
                    logger.error(caller, error);
                    this.mustStop = true;
                    statusOk = false;
                }
            }
            //We exited from the infinite scanning process
            logger.log(caller, 'INFO0', 'Exited from scanning process');
            this.running = false;
            return {ok: statusOk};
        } else {
            logger.log(caller, 'ERROR', 'ERROR: file to scan is undefined. Service not started');
            throw new Error('Cannot start scan');
        }
    }
    async stopService() {
        var caller = 'stopService';
        logger.log(caller, 'INFO1', 'We must stop service');
        this.mustStop = true;
        if(this.timeOut) clearTimeout(this.timeOut);
        return {ok: true};
    }
    async getScanData() {
        var caller = 'getScanData';
        //Return current xlsx file content.
        try {
            let result = await this.xlsDataConnector.read();
            if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: xlsDataConnector.read result is ko');
                return {ok: false};
            }
            logger.log(caller, 'INFO2', 'this.xlsDataConnector.read successful. Return data');
            logger.log(caller, 'DEBUG', JSON.stringify(result.data));
            return result;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: xlsDataConnector.read failed');
            logger.error(caller, error);
            return {ok: false};
        }
    }
}
module.exports = ScanXls;