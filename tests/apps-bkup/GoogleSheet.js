const App = require('../src/apps/App');
const GoogleApi = require('../src/dataConnectors/googleApi/googleApi');
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'GoogleSheet');
/*--------------------------------------------------------------------------------------------
		GoogleSheet
---------------------------------------------------------------------------------------------*/
class GoogleSheet extends App {
	constructor(data, proxy) {
        super(data, proxy);
    }
	//Start service
	async start() {
		var caller = 'start';
		logger.log(caller, 'INFO0', 'GoogleSheet running ...');
		var googleApi = new GoogleApi();
		try {
			let result = await googleApi.connect();
			logger.log(caller, 'DEBUG', 'Result: ' + JSON.stringify(result)); 
			if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: googleApi.connect result is ko');
                return {ok: false};
			}
        } catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: googleApi.connect failed');
            return {ok: false};
		}
		var result = await googleApi.getDriveFileId(this.config.sheetName);
		var sheetId = result.data;
		var values = [
			["Item", "Cost($)", "Stocked", "Ship Date"],
			["Wheel", "20.50", "4", "3/1/2016"],
			["Door", "15", "2", "3/15/2016"],
			["Engine", "100", "1", "3/20/2016"],
			["Totals", "=SUM(B2:B4)", "=SUM(C2:C4)", "=MAX(D2:D4)"]
		];
		var range = 'Test!A1:D5';
		var resource = {
			range: range,
			majorDimension: 'ROWS',
			values: values
		}
		var result = await googleApi.updateSheetValues(sheetId, range, resource);
		logger.log(caller, 'INFO0', 'result: ' + JSON.stringify(result.data));
		/*
		logger.log(caller, 'INFO0', 'Check file exist'); 
		try {
			let result = await googleApi.getDriveFileExist(this.config.sheetName);
			if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: googleApi.getDriveFileExist result is ko');
                return {ok: false};
			}
			if(result.data == true)
				logger.log(caller, 'INFO0', 'File exists: ' + this.config.sheetName);
			else
				logger.log(caller, 'ERROR', 'ERROR: File does not exist: ' + this.config.sheetName);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: googleApi.getDriveFileExist failed');
			logger.error(caller, error);
			return {ok: false};
		}
		logger.log(caller, 'INFO0', 'Get sheetId'); 
		try {
			let result = await googleApi.getDriveFileId(this.config.sheetName);
			if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: googleApi.getDriveFileId result is ko');
                return {ok: false};
			}
			var sheetId = result.data;
			logger.log(caller, 'INFO0', 'SheetId: ' + sheetId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: googleApi.getDriveFileId failed');
			logger.error(caller, error);
			return {ok: false};
		}
		logger.log(caller, 'INFO0', 'Get sheet data. Range: ' + this.config.cellRange); 
		try { 
			let result = await googleApi.getSheetValues(sheetId, this.config.cellRange);
			if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: googleApi.getSheetValues result is ko');
                return {ok: false};
			}
			var data = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: googleApi.getSheetValues failed');
			logger.error(caller, error);
			return {ok: false};
		}
		const rows = data.data.values;
		for(var rowId=0; rowId<rows.length; rowId++) {
			const row = rows[rowId];
			var rowData = '';
			for(var colId=0; colId<row.length; colId++)
				rowData += row[colId] + ' ';
			logger.log(caller, 'INFO0', rowId + ': ' + rowData);
		}
		logger.log(caller, 'INFO0', 'Get file modified time'); 
		try {
			let result = await googleApi.getDriveFileModifiedTimeById(sheetId);
			if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: googleApi.getDriveFile result is ko');
                return {ok: false};
			}
			logger.log(caller, 'INFO0', JSON.stringify(result.data));
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: googleApi.getDriveFile failed');
			logger.error(caller, error);
			return {ok: false};
		}
		*/
		return {ok: true};
	};
	//End service
	async stop() {
		var caller = 'stop';
		logger.log(caller, 'INFO0', 'GoogleSheet stopping ...');
		return {ok: true};
	}
}
module.exports = GoogleSheet;