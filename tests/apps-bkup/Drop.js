var fs = require('fs');
var util = require('util');
var App = require('../src/apps/App');
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'Drop');
/*--------------------------------------------------------------------------------------------
		Drop
---------------------------------------------------------------------------------------------*/
class Drop extends App {
	constructor(data, proxy) {
        super(data, proxy);
    }
	//Start service
	async start() {
		const caller = 'start';
		this.dropService = new DropService(this.api, this.name, this.config, this.logger);
		try {
			let result = await this.dropService.startService();
			logger.log(caller, 'INFO2', 'dropService.startService returned');
            if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: dropService.startService result is ko');
				return {ok: false};
            }
            return result;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: dropService.startService failed');
            return {ok: false};
        }
	}
	//Stop service
	async stop() {
		const caller = 'stop';
		logger.log(caller, 'DEBUG', 'Drop service stopped');
		return await this.dropService.stopService();
	}
}
/*--------------------------------------------------------------------------------------------
		DropService
---------------------------------------------------------------------------------------------*/
class DropService {
	constructor(api, name, configData, logger) {
		const caller = 'DropService';
		var error = false;
		this.api = api;
		this.name = name;
		this.logger = logger;
		this.status = 'idle';
		if(configData.playlist)
			this.playlist = configData.playlist;
		else {
			logger.log(caller, 'ERROR', 'playlist is not specified in params list for ' + name);
			error = true;
		}
		if(configData.scanTimeSec)
			this.scanTimeSec = configData.scanTimeSec;
		else {
			logger.log(caller, 'ERROR', 'scanTimeSec is not specified in params list for ' + name);
			error = true;
		}
		if(configData.deleteMediaLib)
			this.deleteMediaLib = configData.deleteMediaLib;
		else {
			logger.log(caller, 'ERROR', 'deleteMediaLib is not specified in params list for ' + name);
			error = true;
		}
		if(configData.folderToScan)
			this.folderToScan = configData.folderToScan;
		else {
			logger.log(caller, 'ERROR', 'folderToScan is not specified in params list for ' + name);
			error = true;
		}
		if(configData.mediaPrefix)
			this.mediaPrefix = configData.mediaPrefix;
		else {
			logger.log(caller, 'WARNING', 'WARNING: No mediaPrefix specified for ' + name);
			this.mediaPrefix = '';
		}
		if(configData.scanPlaylistSec)
			this.scanPlaylistSec = configData.scanPlaylistSec;
		else {
			logger.log(caller, 'WARNING', 'WARNING: No scanPlaylistSec specified for ' + name);
			this.scanPlaylistSec = 0;
		}
		this.playlistScanTime = 0;
		this.mediaList = [];
		if(!error)
			this.status = 'init';
		else
			this.status = 'error';
	}
	//Start drop service
	async startService() {
		const caller = 'startService';
		//Start drop service
		if(this.status != 'init') {
			logger.log(caller, 'ERROR', 'Drop service is not initialized. Cannot start');
			throw new Error('Bad status: ' + this.status);
		}
		logger.log(caller, 'INFO2', 'Create playlist if not exist: ' + this.playlist);
		//Create the playlist if not exist yet
		var data = {name: this.playlist};
		try {
			let result = await this.api.playlist.createIfNotExist(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: api.playlist.createIfNotExist result is ko');
				return result;
			}
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: api.playlist.createIfNotExist failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Get and store playlist id
		try {
			let result = await this.api.playlist.getId(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: api.playlist.getId result is ko');
				return result;
			}
			this.playlistId = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: api.playlist.getId failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Get current playlist content
		//Only care about media that contains the name prefix
		try {
			//Initialize playlistScanTime
			this.playlistScanTime = new Date().getTime();
			let result = await this.scanPlaylistContent();
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: scanPlaylistContent result is ko');
				return result;
			}
			//Initialize mediaList
			this.mediaList = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: scanPlaylistContent failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Now we are ready to scan the folder content
		logger.log(caller, 'INFO0', 'Folder: ' + this.folderToScan + ', Playlist: ' + this.playlist);
		//Start scan infinitely without waiting for completion
		this.mustStop = false;
		//Return to the caller once scan has stopped
		return await this.scan();
	}
	//Stop drop service
	async stopService() {
		const caller = 'stopService';
		logger.log(caller, 'INFO0', 'Stop scan folder ' + this.folderToScan);
		this.mustStop = true;
		if(this.timer) clearTimeout(this.timer);
		return {ok: true};
	}
	//scan
	async scan() {
		const caller = 'scan';
		//Wait
		wait = async(timeout) => {
			return await new Promise((resolve) => {this.timer = setTimeout(() => {resolve()}, timeout * 1000);});
		}
		//Start scanning of folder and playlist content
		while(!this.mustStop) {
			logger.log(caller, 'INFO1', 'Scanning folder: ' + this.playlist);
			var mediaToBeDeleted = [];
			var mediaIdToRemove = [];
			//First set all current media status to idle
			for(var mediaId=0; mediaId<this.mediaList.length; mediaId++)
				this.mediaList[mediaId].status = 'idle';
			var scanDir = this.folderToScan;
			//Check folder exists
			const accessFile = util.promisify(fs.access);
			try {
				await accessFile(scanDir);
			} catch(error) {
				logger.log(caller, 'DEBUG', 'accessFile failed');
				logger.log(caller, 'ERROR', 'ERROR: Directory does not exist: ' + scanDir);
				logger.error(caller, error);
				this.mustStop = true;
				return {ok: false};
			}
			//Read files from folder
			const readDir = util.promisify(fs.readdir);
			try {
				var files = await readDir(scanDir);
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: fs.readdir failed');
				logger.error(caller, error);
				this.mustStop = true;
				return {ok: false};
			}
			//Scan current playlist content if time elapsed exceeds scanPlaylistSec value
			var time = new Date().getTime();
			if((this.scanPlaylistSec != 0) && ((time - this.playlistScanTime) >= this.scanPlaylistSec*1000)) {
				try {
					this.playlistScanTime = time;
					let result = await this.scanPlaylistContent();
					if(!result.ok) {
						logger.log(caller, 'DEBUG', 'ERROR: scanPlaylistContent result is ko');
						this.mustStop = true;
						return {ok: false};
					}
					//Update mediaList with playlist content
					this.mediaList = [];
					this.mediaList = result.data;
					logger.log(caller, 'DEBUG', 'this.mediaList length: ' + this.mediaList.length);
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: scanPlaylistContent failed');
					logger.error(caller, error);
					this.mustStop = true;
					return {ok: false};
				}
			} else
				logger.log(caller, 'DEBUG', 'No need to scan current playlist content');
			//Parse all files found in folder
			for(var i=0; i<files.length; i++) {
				//Check it's not a folder
				if(!files[i].isDir) {
					var found = false;
					//Parse all media from mediaList
					for(var mediaId=0; mediaId<this.mediaList.length; mediaId++) {
						var media = this.mediaList[mediaId];
						//Check if file already exist in current media list
						if(media.name == (this.mediaPrefix + files[i])) {
							//Media already exist in list. We must check if it has been modified since
							found = true;
							var fileStats = fs.statSync(scanDir + '/' + files[i]);
							var date = new Date(util.inspect(fileStats.mtime));
							var time = date.getTime();
							//Check if file date has change
							if(media.time < time) {
								//File has been modified
								logger.log(caller, 'DEBUG', 'New time: ' + time);
								logger.log(caller, 'DEBUG', 'Old time: ' + media.time);
								logger.log(caller, 'DEBUG', 'Update file: ' + files[i] + ', size: ' + fileStats.size);
								media.size = fileStats.size,
								media.time = time,
								//Set status to modified
								media.status = 'modified';
								//Media must first be deleted in the playlist
								mediaToBeDeleted.push(media);
							} else
								//Media has not been modified
								media.status = 'found';
							break;
						}
					}
					if(!found) {
						//The file in folder is unknown. It must be uploaded later
						//Add new media in list and set status to new
						var fileStats= fs.statSync(scanDir + '/' + files[i]);
						var date = new Date(util.inspect(fileStats.mtime));
						var time = date.getTime();
						logger.log(caller, 'DEBUG', 'Add new media: ' + files[i] + ', size: ' + fileStats.size + ', time: ' + time);
						this.mediaList.push({
							name: this.mediaPrefix + files[i],
							path: scanDir + '/' + files[i],
							size: fileStats.size,
							time: time,
							status: 'new'
						});
					}
				}
			}
			//If media is still in idle state (means it has not been found in the folder) add it to the remove list
			var mustProcess = false;
			//Parse all media from current playlist content and check their status
			for(var mediaId=0; mediaId<this.mediaList.length; mediaId++) {
				var media = this.mediaList[mediaId];
				if(media.status != 'found')
					mustProcess = true;
				//Only delete media with name containing the media prefix
				if(media.status == 'idle') {
					//Media must be deleted from the playlist
					logger.log(caller, 'INFO1', 'media must be deleted from playlist. media: ' + media.name);
					mediaToBeDeleted.push(media);
					//Will be removed from the media array
					mediaIdToRemove.push(mediaId);
				}
			}
			//Now all files from the folder have been checked. We'll now process them accordingly if need be
			if(mustProcess) {
				try {
					//Perform media processing. Delete or upload medias, publish playlist when all medias have been processed
					let result = await this.processMedia(mediaToBeDeleted, mediaIdToRemove);
					if(!result.ok) {
						logger.log(caller, 'DEBUG', 'ERROR: processMedia result is ko');
						this.mustStop = true;
						return {ok: false};
					}
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: processMedia failed');
					logger.error(caller, error);
					this.mustStop = true;
					return {ok: false};
				}
			}
			//Wait a while before scanning again
			if(!this.mustStop) await wait(this.scanTimeSec);
		}
		//Scanning process has been stopped
		logger.log(caller, 'INFO0', 'Scanning process has been stopped');
		return {ok: true};
	}
	//processMedia
	async processMedia(mediaToBeDeleted, mediaIdToRemove) {
		const caller = 'processMedia';
		logger.log(caller, 'INFO0', 'Start processing ...'); 
		logger.log(caller, 'DEBUG', 'mediaToBeDeleted length: ' + mediaToBeDeleted.length);
		logger.log(caller, 'DEBUG', 'mediaIdToRemove length: ' + mediaIdToRemove.length);
		//First delete media from the playlist content
		var data = {name: this.playlist, playlistId: this.playlistId, mediaIdList: mediaToBeDeleted};
		try {
			let result = await this.api.playlist.deleteMultiContentFromId(data);
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: api.playlist.deleteMultiContentFromId result is ko');
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: api.playlist.deleteMultiContentFromId failed');
			return {ok: false};
		}
		if(mediaToBeDeleted.length > 0)
			logger.log(caller, 'INFO1', 'Medias have been deleted from playlist');
		//Now upload new medias
		const uploadMedia = async(media) => {
			logger.log(caller, 'INFO1', 'Check media: ' + media.name);
			if((media.status == 'modified') || (media.status == 'new')) {
				//we must upload the new media into playlist
				logger.log(caller, 'INFO1', 'Media must be uploaded: ' + media.name);
				var data = {name: this.playlist, src: media.path, contentName: media.name, id: this.playlistId};
				try {
					let result = await this.api.playlist.uploadContentById(data);
					if(!result.ok)
						logger.log(caller, 'DEBUG', 'ERROR: api.playlist.uploadContentById result is ko');
					else
						logger.log(caller, 'INFO1', 'Media uploaded in playlist: ' + media.name);
					return result;
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: api.playlist.uploadContentById failed');
					logger.error(caller, error);
					return {ok: false};
				}
			} else
				return {ok: true};
		}
		//Create and execute in parallel upload function for each media
		var uploadFunct = this.mediaList.map((media) => {return uploadMedia(media);});
		try {
			const resultList = await Promise.all(uploadFunct);
			//Now check the global status
			var allOk = true;
			for(let id=0; id<resultList.length; id++) {if(!resultList[id].ok) {logger.log(caller, 'ERROR', 'ERROR: uploadMedia result is ko'); allOk = false;}};
			if(!allOk) return {ok: false};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for uploadFunct. ' + error);
			logger.error(caller, error);
			return {ok: false};
		}
		//Now publish the playlist and delete media from the library
		try {
			let result = await this.publishAndDeleteMedia(mediaIdToRemove, mediaToBeDeleted);
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: publishAndDeleteMedia result is ko');
			else
				logger.log(caller, 'INFO1', 'publishAndDeleteMedia successfull');
			logger.log(caller, 'INFO0', 'Processing completed'); 
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: publishAndDeleteMedia failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//publishAndDeleteMedia
	async publishAndDeleteMedia(mediaIdToRemove, mediaToBeDeleted) {
		const caller = 'publishAndDeleteMedia';
		//Media processing is finished
		//We must now publish the playlist
		var data = {name: this.playlist, id: this.playlistId};
		try {
			let result = await this.api.playlist.publishById(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: api.playlist.publish result is ko');
				return result;
			}
			logger.log(caller, 'INFO1', 'Playlist published: ' + this.playlist);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: api.playlist.publish failed');
			return {ok: false};
		}
		//Now clean mediaList
		for (var id=mediaIdToRemove.length-1; id>=0; id--)
			this.mediaList.splice(mediaIdToRemove[id],1)
		logger.log(caller, 'INFO1', 'mediaList length: ' + this.mediaList.length);
		//Delete media from library as well if need be
		//We cannot delete all media at once
		const deleteMedia = async(mediaId) => {
			try {
				let result = await this.api.media.deleteFromId({id: mediaId});
				if(!result.ok)
					logger.log(caller, 'DEBUG', 'ERROR: api.media.deleteFromId result is ko');
				else
					logger.log(caller, 'INFO1', 'media has been deleted. mediaId: ' + mediaId);
				return result;
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: api.media.deleteFromId failed');
				logger.error(caller, error);
				return {ok: false};
			}
		}
		if(this.deleteMediaLib && (mediaToBeDeleted.length > 0)) {
			//Create and execute in parallel delete function for each media
			var deleteFunct = mediaToBeDeleted.map((media) => {return deleteMedia(media.media_id);});
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
		} else
			return {ok: true};
	}
	//scanPlaylistContent
	async scanPlaylistContent() {
		const caller = 'scanPlaylistContent';
		//Scan the playlist content to check if changes have been made since last time
		logger.log(caller, 'INFO1', 'Scan playlist content');
		var data = {name: this.playlist, id: this.playlistId};
		//First get playlist current content
		try {
			let result = await this.api.playlist.getContentById(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: api.playlist.getContent result is ko');
				return result;
			}
			var playlistContent = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: api.playlist.getContent failed');
			return {ok: false};
		}
		var playlistMediaList = [];
		logger.log(caller, 'DEBUG', 'playlist.getContent successful');
		//Create media list with current playlist content
		var mediaId = 0;
		for(let id=0; id<playlistContent.length; id++) {
			var content = playlistContent[id];
			logger.log(caller, 'INFO2', 'Content for playlist ' + this.playlist + ': title: ' + content.title);
			//Do not care of medias whose name does not contain prefix
			//That means that playlist can have media other than ones from the folder provided the media prefix is set
			if(content.title.indexOf(this.mediaPrefix) >= 0) {
				playlistMediaList[mediaId] = {
					name: content.title,
					id: content.id,
					media_id: content.media_id,
					path: this.folderToScan + '/' + content.title,
					size: 0,
					time: this.playlistScanTime,
					status: 'idle'
				}
				mediaId++;
			}
		}
		logger.log(caller, 'INFO2', 'playlistMediaList length: ' + playlistMediaList.length);
		return {ok: true, data: playlistMediaList};
	}
}
module.exports = Drop;