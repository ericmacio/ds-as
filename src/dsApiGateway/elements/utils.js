const Playlist = require('./playlist.js');
const Slide = require('./slide.js');
const Media = require('./media.js');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'utils');
/*--------------------------------------------------------------------------------------------
		Utils
---------------------------------------------------------------------------------------------*/
class Utils {
	constructor(apiCore) {
		this.apiCore = apiCore;
		this.playlist = new Playlist(this.apiCore);
		this.slide = new Slide(this.apiCore);
		this.media = new Media(this.apiCore);
    }
    getUser() {
        return this.apiCore.getUser();
	}
	//publishSlides
    async publishSlides(publishDataList) {
        const caller = 'publishSlides';
		//First create and post slides into playlists
		try {
			const result = await this.createSlides(publishDataList)
			if(!result.ok) {
				logger.log(caller, 'ERROR', 'ERROR: createSlides result is ko');
				return {ok: false};
			}
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: createSlides failed');
			logger.error(caller, error);
			return {ok: false};
        }
        //All slides have been created and posted into the playlists
        //We must now publish all the playlists
		try {
			const result = await this.publishPlaylists(publishDataList)
			if(!result.ok) {
				logger.log(caller, 'ERROR', 'ERROR: publishPlaylists result is ko');
				return {ok: false};
			}
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: publishPlaylists failed');
			logger.error(caller, error);
			return {ok: false};
        }
		return {ok: true};
    }
	//publishSlides
    async publishSlidesSync(publishDataList) {
        const caller = 'publishSlidesSync';
		//First create and post slides into playlists
		try {
			const result = await this.createSlidesSync(publishDataList)
			if(!result.ok) {
				logger.log(caller, 'ERROR', 'ERROR: createSlides result is ko');
				return {ok: false};
			}
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: createSlides failed');
			logger.error(caller, error);
			return {ok: false};
        }
        //All slides have been created and posted into the playlists
        //We must now publish all the playlists
		logger.log(caller, 'INFO0', 'Publishing playlists');
		try {
			const result = await this.publishPlaylists(publishDataList)
			if(!result.ok) {
				logger.log(caller, 'ERROR', 'ERROR: publishPlaylists result is ko');
				return {ok: false};
			}
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: publishPlaylists failed');
			logger.error(caller, error);
			return {ok: false};
        }
		return {ok: true};
    }
	//createSlides
    async createSlides(publishDataList) {
        const caller = 'createSlides';
        //Create and execute in parallel post slide function for each data into publishDataList
		var postSlideFunct = publishDataList.map((publishData) => {return this.createAndPostSlide(publishData);});
		try {
			const resultList = await Promise.all(postSlideFunct);
			//Now check the global status
			var allOk = true;
			for(let id=0; id<resultList.length; id++) {if(!resultList[id].ok) {logger.log(caller, 'ERROR', 'ERROR: createAndPostSlide result is ko'); allOk = false;}};
			if(!allOk) return {ok: false};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for postSlideFunct. ' + error);
			logger.error(caller, error);
			return {ok: false};
		}
		logger.log(caller, 'INFO0', publishDataList.length + ' slide(s) created');
		return {ok: true};
	}
	//createSlides
    async createSlidesSync(publishDataList) {
        const caller = 'createSlidesSync';
        //Create slides one after the other for each data into publishDataList
		this.createSlideSync = async(id) => {
			let publishData = publishDataList[id];
			try {
				const result = await this.createAndPostSlide(publishData);
				if(!result.ok) {
					logger.log(caller, 'ERROR', 'ERROR: createAndPostSlide result is ko');
					return {ok: false};
				} else {
					logger.log(caller, 'INFO0', 'Slide created: ' + publishData.slideData.name);
					id++;
					if(id < publishDataList.length)
						return(await this.createSlideSync(id));
					else
						return {ok: true};
				}
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: createAndPostSlide failed');
				logger.error(caller, error);
				return {ok: false};
			}
		}
		if(publishDataList.length > 0)
			var result = await this.createSlideSync(0);
		else {
			logger.log(caller, 'WARNING', 'WARNING: publishDataList is empty');
			var result = {ok: true};
		}
		return (result);
	}
    //createAndPostSlide
    async createAndPostSlide (publishData) {
		const caller = 'createAndPostSlide';
        //Create a slide from slideData and put it into playlist from playlistData
        //Get playlist id for this slide
        var playlistId = publishData.playlistId;
        //Get slide data
        var slideData = publishData.slideData;
        logger.log(caller, 'INFO2', 'Creating slide: ' +  slideData.name);
        //Create the slide
        try {
            let result = await this.slide.create(slideData);
            if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: api.slide.create result is ko');
                return result;
			}
			var contentId = result.data.id;
			logger.log(caller, 'INFO2', 'slideId: ' + contentId);
            logger.log(caller, 'INFO1', 'Slide created: ' + slideData.name);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: api.slide.create failed');
            logger.error(caller, error);
            return {ok: false};               
		}
		//Put the slide into the playlist
		var postData = {id: playlistId, contentType: 'slide', contentId: contentId};
		try {
			let result = await this.playlist.postContentFromId(postData);
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: api.playlist.postContentFromId result is ko');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: api.playlist.postContentFromId failed');
			logger.error(caller, error);
			return {ok: false};
		}
    }
	//publishPlaylists
	async publishPlaylists(publishDataList) {
		const caller = 'publishPlaylists';
		//Create the playlist table
		var playlistList = [];
		for(let id=0; id<publishDataList.length; id++) {
			var playlist = publishDataList[id].playlist;
			if(!playlistList.includes(playlist)) {
				logger.log(caller, 'INFO1', 'Add playlist: ' + playlist);
				playlistList.push(playlist);
			}
		}
        //Create and execute the publish playlist function table
		var publishFunct = playlistList.map((playlist) => {return this.playlist.publish({name: playlist});});
		try {
			const resultList = await Promise.all(publishFunct);
			//Now check the global status
			var allOk = true;
			for(let id=0; id<resultList.length; id++) {if(!resultList[id].ok) {logger.log(caller, 'ERROR', 'ERROR: publishPlaylist result is ko'); allOk = false;}};
			return {ok: allOk};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for publishFunct. ' + error);
			logger.error(caller, error);
			return {ok: false};
        }
	}
    //deleteMedias
    async deleteMedias(mediaNameList) {
        const caller = 'deleteMedias';
        //If no slide to be deleted return right now
        if((typeof(mediaNameList) == 'undefined') || (mediaNameList.length == 0)) {
			logger.log(caller, 'WARNING', 'WARNING: mediaNameList is undefined or empty');
			return {ok: true};
		}
        //Create and execute the delete media function table
		var deleteFunct = mediaNameList.map((MediaName) => {return this.media.delete({name: MediaName});});
		try {
			const resultList = await Promise.all(deleteFunct);
			//Now check the global status
			var allOk = true;
			for(let id=0; id<resultList.length; id++) {if(!resultList[id].ok) {logger.log(caller, 'ERROR', 'ERROR: deleteMedia result is ko'); allOk = false;}};
			return {ok: allOk};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for deleteFunct. ' + error);
			logger.error(caller, error);
			return {ok: false};
        }
    }
}
module.exports = Utils;