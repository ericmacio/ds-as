const App = require('../src/apps/App');
const GoogleApi = require('../src/dataConnectors/googleApi/googleApi');
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'ExportToSheet');
/*--------------------------------------------------------------------------------------------
		ExportToSheet
---------------------------------------------------------------------------------------------*/
class ExportToSheet extends App {
	constructor(data, proxy) {
        super(data, proxy);
    }
	//Start service
	async start() {
		var caller = 'start';
		//Wait function
        this.wait = async(timeoutSec) => {
			return new Promise((resolve) => {this.timeOut = setTimeout(() => {resolve()}, timeoutSec * 1000)});
		}
		//updateSheet
		this.updateSheet = async() => {
			//First get list of all feeds
			try {
				let result = await this.api.feed.list();
				if(!result.ok) {
					logger.log(caller, 'DEBUG', 'ERROR: api.feed.list result is ko'); 
					return {ok: false};
				}
				var feedList = result.data;
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: api.feed.list failed');
				return {ok: false};
			}
			//Init values data structure. This will be used later to update google sheet
			var values = [];
			//Set headers to first row of values
			values[0] = this.config.filter.list.concat(this.config.filter.data);
			//Parse feed info list to set values data
			for(var id=0; id<feedList.length; id++) {
				//Set current feed
				var feed = feedList[id];
				//First row is for headers
				var valuesId = id + 1;
				values[valuesId] = [];
				//Parse all filters and fill value from feed info
				for(let filterId=0; filterId<this.config.filter.list.length; filterId++) {
					var key = this.config.filter.list[filterId];
					if(feed[key]) {
						//format date values
						if((key == 'creation_date') || (key == 'last_update_date')) {
							var date = new Date(feed[key]);
							var dateString = date.toLocaleString();
							values[valuesId].push(dateString);
						} else 
							values[valuesId].push(feed[key]);
					} else
						values[valuesId].push('');
				}
				//Get feed data
				try {
					//Warning: We must use subtype instead of type for the feed type
					let result = await this.api.feed.getDataById({id: feed.id, type: feed.subtype});
					if(!result.ok) {
						logger.log(caller, 'DEBUG', 'ERROR: api.feed.getDataById result is ko'); 
						return {ok: false};
					}
					var feedData = result.data;
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: api.feed.getDataById failed');
					return {ok: false};
				}
				//Complete value with feed data
				for(let dataId=0; dataId<this.config.filter.data.length; dataId++) {
					var key = this.config.filter.data[dataId];
					if(feedData[key])
						values[valuesId].push(feedData[key]);
					else
						values[valuesId].push('');
				}
			}
			//Display values
			for(var valuesId=0; valuesId<values.length; valuesId++) {
				logger.log(caller, 'INFO2', '---------------------------');
				var valueString = '';
				for(var id=0; id<values[valuesId].length; id++)
					valueString += values[valuesId][id] + ' ';
				logger.log(caller, 'INFO2', 'Value: ' + valueString);
			}
			logger.log(caller, 'INFO2', '---------------------------');
			//Update spreadsheet values
			var resource = {
				range: this.config.range,
				majorDimension: this.config.majorDimension,
				values: values
			}
			try {
				let result = await googleApi.updateSheetValues(this.sheetId, this.config.range, resource);
				if(!result.ok) {
					logger.log(caller, 'DEBUG', 'ERROR: googleApi.updateSheetValues result is ko');
					return {ok: false};
				}
				logger.log(caller, 'DEBUG', 'result data: ' + JSON.stringify(result.data));
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: googleApi.updateSheetValues failed');
				return {ok: false};
			}
			//Set last update date field
			var date = new Date();
			var msec = date.getMilliseconds();
			if(msec<10) msec = "0" + msec;
			var dateString = 'Last update: ' + date.toLocaleString() + ":" + msec;
			var values = [];
			values[0] = [];
			values[0].push(dateString);
			//Update spreadsheet values
			var resource = {
				range: this.config.lastTimeRange,
				majorDimension: this.config.majorDimension,
				values: values
			}
			try {
				let result = await googleApi.updateSheetValues(this.sheetId, this.config.lastTimeRange, resource);
				if(!result.ok) {
					logger.log(caller, 'DEBUG', 'ERROR: googleApi.updateSheetValues result is ko');
					return {ok: false};
				}
				logger.log(caller, 'DEBUG', 'result data: ' + JSON.stringify(result.data));
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: googleApi.updateSheetValues failed');
				logger.error(caller, error);
				return {ok: false};
			}
			return {ok: true};
		};
		logger.log(caller, 'INFO0', 'ExportToSheet starting ...');
		//Create googleApi instance
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
			logger.error(caller, error);
			return {ok: false};
		}
		//Get spreadsheet id
		try {
			let result = await googleApi.getDriveFileId(this.config.sheetName);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: googleApi.getDriveFileId result is ko');
				return {ok: false};
			}
			this.sheetId = result.data;
			logger.log(caller, 'INFO1', 'sheetId: ' + this.sheetId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: googleApi.getDriveFileId failed');
			logger.error(caller, error);
			return {ok: false};
		}
		var statusOk = true;
		this.mustStop = false;
		while(!this.mustStop && statusOk) {
			logger.log(caller, 'INFO0', 'Sheet update processing ...');
			try {
				let result = await this.updateSheet();
				logger.log(caller, 'INFO2', 'updateSheet returned: ' + JSON.stringify(result));
				if(!result.ok) {
					logger.log(caller, 'DEBUG', 'ERROR: updateSheet result is ko');
					statusOk = false;
				} else {
					logger.log(caller, 'INFO0', 'Sheet update completed');
					//Wait until the next update
					if(!this.mustStop) {
						await this.wait(this.config.updateSec);
						this.timeOut = null;
					}
				}
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: updateSheet failed');
				logger.error(caller, error);
				statusOk = false;
			}
		}
		//We exited from the infinite update process
		logger.log(caller, 'INFO0', 'Exited from update process');
		return {ok: statusOk};
	};
	//Stop service
	async stop() {
		var caller = 'stop';
		logger.log(caller, 'INFO0', 'ExportToSheet stopping ...');
		this.mustStop = true;
		if(this.timeOut) clearTimeout(this.timeOut);
		return {ok: true};
	}
}
module.exports = ExportToSheet;