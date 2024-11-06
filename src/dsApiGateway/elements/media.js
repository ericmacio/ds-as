const Generic = require('./Generic.js');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'media');
var TYPE = 'media';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get profile. " + error);
	logger.error(caller, error);
	process.exit();
}
var CHECK_ENCODING_FREQ_S = 15;
/*--------------------------------------------------------------------------------------------
		Media
---------------------------------------------------------------------------------------------*/
class Media {
	constructor(apiCore) {
        this.apiCore = apiCore;
		this.profile = PROFILE;
		this.type = TYPE;
		this.generic = new Generic(this.apiCore, this.type, this.profile, null);
    }
    async upload(data) {
        var caller = 'upload';
		var fileDesc = {
			title: data.name,
			name: data.name,
			path: data.src,
			url: data.url,
			uploadData: {
				uploadId: Math.floor((Math.random() * 1000000) + 1),
				originalFileName: data.src
			}
		}
		//If media has to be downloaded directly into a playlist
		if(data.playlistId)
			fileDesc.uploadData.playlistId = data.playlistId;
		//If media has to be downloaded directly into a channel
		if(data.channelId)
			fileDesc.uploadData.channelId = data.channelId;
		var title = fileDesc.title;
		try {
			let result = await this.apiCore.uploadFile(fileDesc);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: apiCore.uploadFile result is ko');
				return result;
			}
			var uploadData = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.uploadFile failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Now save the uploaded file by specifying additional parameters
		var urlPath = '/' + uploadData.id;
		var headers = {};
		var sentData = {
			params: {
				title: title,
				hebdo_days: 127,
				actions_defined: true,
				days: [2, 4, 8, 16, 32, 64, 1],
				id: uploadData.id,
				uploadUrl: '#media-library/add/file/' + uploadData.id,
				identifier: uploadData.id,
				status: 'uploaded',
				metadata_title: title,
				metadata_allow_in_playlist: true,
				extension: uploadData.metadata_extension,
				type_file: uploadData.type,
				upload: {
					received: uploadData.size,
					size: uploadData.size,
					progress: 100
				},
				upload_url: uploadData.url,
				file_url: uploadData.urlXfer,
				file_thumburl: uploadData.urlXfer_thumb,
				urlName: uploadData.name,
				metadata_iscreen: true,
				metadata_isintranet: false,
				metadata_continuous_diffusion: true,
				metadata_sound: 0,
				metadata_start_validity: uploadData.creation_date,
				metadata_start_datetime: uploadData.creation_date,
				metadata_hebdo_days: uploadData.metadata_hebdo_days,
				metadata_organisations: '',
				metadata_share: 'shared',
				metadata_allow_in_generated_media: false,
				metadata_allow_duplication: false,
				metadata_description: data.description
			}
		}
		var sentForm;
		try {
			var API = require('../api.json');
		} catch(error) {
			logger.log(caller, 'ERROR', "ERROR: Require api config failed: " + error);
			logger.error(caller, error);
			throw new Error('Cannot load api config');
		}
		try {
			let result = await this.apiCore.executeCmd('user', API.cmdList.putSaveUpload, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.executeCmd result is ko');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	async checkVideoEncoded(data) {
		const caller = 'checkVideoEncoded';
		var timeOut = 0;
		const dataTimeOut = data.timeOut ? data.timeOut : 180;
		this.encodingStatus = async (mediaId) => {
			//Get video data
			var item = {type: this.type, profile: this.profile, data: {id: mediaId}};
			try {
				let result = await this.apiCore.getItemDataById(item);
				if(!result.ok) {
					logger.log(caller, 'INFO2', 'ERROR: apiCore.getItemDataById result is ko');
					return result;
				}
				var video = result.data;
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemDataById failed');
				logger.error(caller, error);
				return {ok: false};
			}
			logger.log(caller, 'DEBUG', 'Media encoding status: ' + video.encoding_status);
			if(video.encoding_status != 'ok') {
				logger.log(caller, 'DEBUG', 'Video is not yet encoded: ' + data.name);
				timeOut += CHECK_ENCODING_FREQ_S;
				if(timeOut <= dataTimeOut) {
					logger.log(caller, 'WARNING', 'WARNING: Video not yet encoded: ' + data.name);
					return new Promise(resolve => this.timer = setTimeout(() => {return resolve(this.encodingStatus(mediaId));}, CHECK_ENCODING_FREQ_S * 1000));
				} else {
					logger.log(caller, 'DEBUG', 'Video encoding check failed: ' + data.name);
					return {ok: false};
				}
			} else {
				logger.log(caller, 'INFO0', 'Video encoding check ok: ' + data.name);
				return {ok: true};
			}
		}
		//Get mediaId
		try {
			let result = await this.getId(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getId result is ko');
				return result;
			}
			var mediaId = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getId failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Check encoding status for this mediaId
		try {
			let result = await this.encodingStatus(mediaId);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: encodingStatus result is ko');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: encodingStatus failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	async checkData(data) {return await this.generic.checkData(data).catch((error) => {logger.log('checkData', 'ERROR', 'ERROR: generic.checkData failed'); logger.error(caller, error); return {ok: false};})};
	async delete(data) {return await this.generic.delete(data).catch((error) => {logger.log('delete', 'ERROR', 'ERROR: generic.delete failed'); logger.error(caller, error); return {ok: false};})};
	async deleteFromId(data) {return await this.generic.deleteFromId(data).catch((error) => {logger.log('deleteFromId', 'ERROR', 'ERROR: generic.deleteFromId failed'); logger.error(caller, error); return {ok: false};})};
	async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); logger.error(caller, error); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); logger.error(caller, error); return {ok: false};})};
	async getData(data) {return await this.generic.getData(data).catch((error) => {logger.log('getData', 'ERROR', 'ERROR: generic.getData failed'); logger.error(caller, error); return {ok: false};})};
	async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); logger.error(caller, error); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); logger.error(caller, error); return {ok: false};})};
}
module.exports = Media;