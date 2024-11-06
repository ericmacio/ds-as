const fs = require('fs');
const fsp = require('fs').promises;
var util = require('util');
const path = require('path');
const readXlsx = require('xlsx-to-json-lc');
var DataConnector = require('./DataConnector');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'Xls');
/*--------------------------------------------------------------------------------------------
		Xls
---------------------------------------------------------------------------------------------*/
class Xls extends DataConnector {
    constructor(serviceName, key, config, proxy) {
        const caller = 'Xls';
        super(serviceName, key, config, proxy);
        this.file = config.params.file;
        this.sheet = config.params.sheet;
        this.prefix = config.params.prefix;
        this.fileExportFile = this.prefix + 'export_dataConnector_' + this.sheet + '_' + path.basename(this.file, '.xlsx') + '.json';
        this.fileExportPath = path.dirname(this.file) + '/' + this.fileExportFile;
        this.baseName = path.basename(this.file);
        logger.log(caller, 'DEBUG', 'fileExportPath: ' + this.fileExportPath);
    }
    async read() {
        const caller = 'read';
        logger.log(caller, 'INFO1', 'Read file: ' + this.file);
        //Read excel xlsx file. Warning: may return empty rows and unordered columns ....
        logger.log(caller, 'INFO2', 'Access is ' + this.config.access.type);
        switch(this.config.access.type) {
            case 'remote':
                try {
                    let result = await super.proxyCmd('read', {});
                    if(!result.ok) {
                        logger.log(caller, 'DEBUG', 'ERROR: super.proxyCmd result is ko');
                        return {ok: false};
                    }
                    logger.log(caller, 'DEBUG', 'data: ' + JSON.stringify(result.data));
                    logger.log(caller, 'INFO2', 'Return xls file data');
                    return result;
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: super.proxyCmd failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                break;
            case 'local':
                const params = {input: this.file, output: null, sheet: this.sheet, lowerCaseHeaders: false};
                const readXlsxAsync = util.promisify(readXlsx);
                try {
                    var data = await readXlsxAsync(params);
                    logger.log(caller, 'INFO2', 'data: ' + JSON.stringify(data));
                    logger.log(caller, 'INFO2', 'Return xls file data');
                    return {ok: true, data: data};
                } catch(error) {
                    logger.log(caller, 'ERROR', 'readXlsxAsync failed');
                    return {ok: false}
                }
                break;
            case 'googleApi':
                try {
                    let result = await super.googleApiCmd('readXls', {name: this.file});
                    logger.log(caller, 'DEBUG', 'Result: ' + JSON.stringify(result));
                    if(!result.ok) {
                        logger.log(caller, 'DEBUG', 'ERROR: super.googleApiCmd result is ko');
                        return {ok: false};
                    }
                    logger.log(caller, 'DEBUG', 'data: ' + JSON.stringify(result.data));
                    logger.log(caller, 'INFO2', 'Return xls file data');
                    return result;
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: super.googleApiCmd failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                break;
            default:
                logger.log(caller, 'ERROR', 'ERROR: Bad access type: ' + this.config.access.type);
                break;
        }
    }
    async access() {
        const caller = 'access';
        logger.log(caller, 'DEBUG', 'Access is ' + this.config.access.type);
        switch(this.config.access.type) {
            case 'remote':
                try {
                    let result = await super.proxyCmd('access', {});
                    if(!result.ok)
                        logger.log(caller, 'DEBUG', 'ERROR: super.proxyCmd result is ko');
                    return result;
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: super.proxyCmd failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                break;
            case 'local':
                logger.log(caller, 'DEBUG', 'local access cmd');
                try {
                    await fsp.access(this.file, fs.F_OK);
                    return {ok: true};
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: fsp.access failed for file: ' + this.file + ', error: ' + error);
                    return {ok: false}
                }
                break;
            case 'googleApi':
                try {
                    let result = await super.googleApiCmd('access', {name: this.file});
                    if(!result.ok)
                        logger.log(caller, 'DEBUG', 'ERROR: super.googleApiCmd result is ko');
                    return result;
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: super.googleApiCmd failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                break;
            default:
                logger.log(caller, 'ERROR', 'ERROR: Bad access type: ' + this.config.access.type);
                break;
        }
    }
    async fileTime() {
        const caller = 'fileTime';
        logger.log(caller, 'INFO2', 'Access is ' + this.config.access.type);
        switch(this.config.access.type) {
            case 'remote':
                try {
                    let result = await super.proxyCmd('fileTime', {});
                    if(!result.ok)
                        logger.log(caller, 'DEBUG', 'ERROR: super.proxyCmd result is ko');
                    return result;
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: super.proxyCmd failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                break;
            case 'local':
                try {
                    var fileStats = fs.statSync(this.file);
                    var fileDate = new Date(util.inspect(fileStats.mtime));
                    var time = fileDate.getTime();
                    return {ok: true, data: time};
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: fileStats failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                break;
            case 'googleApi':
                try {
                    let result = await super.googleApiCmd('fileTime', {name: this.file});
                    if(!result.ok)
                        logger.log(caller, 'DEBUG', 'ERROR: super.googleApiCmd result is ko');
                    return result;
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: super.googleApiCmd failed');
                    logger.error(caller, error);
                    return {ok: false};
                }
                break;
            default:
                logger.log(caller, 'ERROR', 'ERROR: Bad access type: ' + this.config.access.type);
                break;
        }
    }
}
module.exports = Xls;