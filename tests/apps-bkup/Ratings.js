const App = require('../src/apps/App');
const GoogleRatings = require('../src/utils/GoogleRatings');
const Logger = require('../src/logging/logger');
const logConfig = {logLevel: 'INFO0', logToFile: true, logFileName: 'ratings.log', maxLogSizeKo: 10};
const logger = new Logger(__filename, 'Ratings', logConfig);
/*--------------------------------------------------------------------------------------------
		Ratings
---------------------------------------------------------------------------------------------*/
class Ratings extends App {
	constructor(data, proxy) {
        super(data, proxy);
		const caller = 'constructor';
		this.mustRun = null;
		this.timeout = null;
		this.publishDataList = [];
		this.elementList = [];
    }
	//Start service
	async start() {
		var caller = 'start';
		this.updateRatingsData = async() => {
			this.getElementRatings = async(element) => {
				var ratings = [];
				//Get ratings data
				try {
					var result = await element.googleRatings.getRatings();
					if(!result.ok) {
						logger.log(caller, 'ERROR', 'ERROR: googleRatings.getRatings result is ko');
						await this.onError();
					}
				} catch (error) {
					logger.log(caller, 'ERROR', 'ERROR: element.googleRatings.getRatings failed');
					logger.error(caller, error);
					await this.onError();
				}
				if(this.mustRun && result.ok) {
					ratings = result.data;
					logger.log(caller, 'INFO0', 'Extract completed. nbItems: ' + ratings.length);
					if(ratings.length != element.nbItems)
						logger.log(caller, 'WARNING', 'WARNING: Unexpected nummber of ratings. Got: ' + ratings.length + ', expected: ' + element.nbItems) ;
					for(let id=0; id<ratings.length; id++) {
						logger.log(caller, 'INFO1', '--- Rating[' + id + ']');
						for(let key in ratings[id])
							logger.log(caller, 'INFO1', key + ': ' + ratings[id][key]);
					}
				}
				if(this.mustRun) {
					//Delete all current medias from library
					logger.log(caller, 'INFO0', 'Deleting current medias');
					try {
						let result = await this.api.utils.deleteMedias(element.mediaNameList);
						if(!result.ok)
							logger.log(caller, 'WARNING', 'WARNING: api.utils.deleteMedias result is ko');
					} catch(error) {
						logger.log(caller, 'ERROR', 'ERROR: api.utils.deleteMedias failed');
						logger.error(caller, error);
						await this.onError();
					}
				}
				if(this.mustRun) {
					//Create slide data for all rating items
					try {
						for(let id=0; id<ratings.length; id++) {
							//Set slide data for slide creation
							var slideData = {};
							//Count the number of photos for this rating
							let nbPhotos = 0;
							for(var key in element.templateData) {
								//Remove null entry
								if(ratings[id][element.templateData[key].value] != null) {
									slideData[key] = {
										type: element.templateData[key].type,
										value: ratings[id][element.templateData[key].value]
									}
									//Identify photos for selecting the right template
									if(key.includes('Photo')) {
										nbPhotos++;
										logger.log(caller, 'INFO2', 'New photo for key: ' + key);
									}
								} else
									logger.log(caller, 'INFO2', 'Null value for key: ' + key + ' and value: ' + element.templateData[key].value);
							}
							logger.log(caller, 'INFO1', 'Nb photos for rating id [' + id + '] : ' + nbPhotos);
							let templateName = element['templateName_' + nbPhotos + 'photos'];
							logger.log(caller, 'INFO1', 'Template name: ' + templateName);
							//Create slide data list
							this.publishDataList.push({
								playlist: element.playlistName,
								playlistId: element.playlistId,
								slideData: {
									name: element.mediaNameList[id],
									template: templateName, 
									slideData: slideData
								}
							});
						}
					} catch(error) {
						logger.log(caller, 'ERROR', 'ERROR: Creating publishDataList failed');
						logger.error(caller, error);
						await this.onError();
					}
				}
				return {ok: true};
			}
			this.publishDataList = [];
			const getElementRatingsFunct = this.elementList.map(element => {return this.getElementRatings(element);});
			try {
				const resultList = await Promise.all(getElementRatingsFunct);
				//Now check the global status
				var allOk = resultList.find(result => !result.ok) ? false : true;
				if(!allOk) {
					logger.log(caller, 'ERROR', 'ERROR: getElementRatingsFunct result is ko');
					await this.onError();
				}
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for getElementRatingsFunct. ' + error);
				logger.error(caller, error);
				await this.onError();
			}
			if(this.publishDataList.length == 0)
				logger.log(caller, 'WARNING', 'WARNING: publishDataList is empty');
			else if(this.mustRun) {
				//Create and post into the playlist new slides with ratings data
				try {
					logger.log(caller, 'INFO0', 'Publishing new medias. publishDataList length: ' + this.publishDataList.length);
					let result = await this.api.utils.publishSlidesSync(this.publishDataList);
					if(!result.ok) {
						logger.log(caller, 'ERROR', 'ERROR: api.utils.publishSlides result is ko');
						await this.onError();
					}
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: api.utils.publishSlides failed');
					logger.error(caller, error);
					await this.onError();
				}
			}
			//Restart polling
			if(this.mustRun) {
				logger.log(caller, 'INFO0', 'Restart polling');
				this.timeout = setTimeout(() => {this.updateRatingsData();}, this.config.pollingTimerSec * 1000);
			} else
				logger.log(caller, 'INFO0', 'Polling must be stopped');
		}
		logger.log(caller, 'INFO0', 'Ratings started');
		this.mustRun = true;
		this.elementList = this.config.elementList.filter(element => element.enable);
		logger.log(caller, 'INFO2', 'Number of enabled element: ' + this.elementList.length);
		//Create GoogleRatings instance for each element
		for(let id=0; id<this.elementList.length; id++) {
			//Create GoogleRatings instance
			const { url, nbItems, nbPhotos, ordering } = this.elementList[id];
			this.elementList[id].googleRatings = new GoogleRatings({ url, nbItems, nbPhotos, ordering });
			this.elementList[id].playlistId = null;
			this.elementList[id].mediaNameList = [];
			for(let itemId=0; itemId<nbItems; itemId++)
				this.elementList[id].mediaNameList.push(this.elementList[id].mediaPrefix + itemId);
		}
		//Get playlist id of each element. Create playlist if not exist
		const getPlaylistIdFunc = this.elementList.map(element => {return this.getPlaylistId(element.playlistName);});
		try {
			const resultList = await Promise.all(getPlaylistIdFunc);
			//Now check the global status
			var allOk = resultList.find(result => !result.ok) ? false : true;
			if(!allOk) {
				logger.log(caller, 'ERROR', 'ERROR: getPlaylistIdFunc result is ko');
				this.mustRun = false;
			} else
				for(let id=0; id<this.elementList.length; id++) {
					this.elementList[id].playlistId = resultList[id].data;
					logger.log(caller, 'INFO2', 'Playlist id for element ' + id + ' : ' + this.elementList[id].playlistId);
				}
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for getPlaylistIdFunc');
			logger.error(caller, error);
			return {ok: false};
		}
		if(this.mustRun) {
			//Start polling ratings data
			try {
				logger.log(caller, 'INFO0', 'Start update rating process');
				this.updateRatingsData();
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: updateRatingsData failed');
				logger.error(caller, error);
				return ({ok: false});
			}
			return ({ok: true});
		} else
			return ({ok: false});
	};
	//End service
	async stop() {
		const caller = 'stop';
		logger.log(caller, 'INFO0', 'Ratings stopped');
		this.mustRun = false;
		clearTimeout(this.timeout);
		for(let id=0; id<this.elementList.length; id++)
			this.elementList[id].googleRatings.stop();
		return ({ok: true});
	}
	//Handle error situation
	async onError() {
		const caller = 'onError';
		await this.stop();
		this.notifyStatus('error');
	}
	async getPlaylistId(playlistName) {
		const caller = 'getPlaylistId';
		//Check playlist exists and create it if not
		try {
			let result = await this.api.playlist.exist({name: playlistName});
			var playlistExist = result.ok ? result.data : false;
		} catch (error) {
			logger.log(caller, 'ERROR', 'ERROR: playlist.exist failed');
			logger.error(caller, error);
			return ({ok: false});
		}
		if(playlistExist)
			logger.log(caller, 'INFO1', 'Playlist: ' + playlistName + ' already exists');
		else {
			logger.log(caller, 'INFO1', 'Creating playlist: ' + playlistName);
			try {
				let result = await this.api.playlist.create({name: playlistName});
				if(result.ok)
					logger.log(caller, 'INFO0', 'Playlist created: ' + playlistName);
				else {
					logger.log(caller, 'ERROR', 'ERROR: playlist.create result is ko');
					return ({ok: false});
				}
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: playlist.create failed');
				logger.error(caller, error);
				return ({ok: false});
			}
		}
		//Get playlist id
		try {
			let result = await this.api.playlist.getId({name: playlistName});
			if(!result.ok) 
				logger.log(caller, 'ERROR', 'ERROR: playlist.getId result is ko');
			return (result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: playlist.getId failed');
			logger.error(caller, error);
			return ({ok: false});
		}
	}
}
module.exports = Ratings;