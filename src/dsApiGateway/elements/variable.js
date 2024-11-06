const Generic = require('./Generic.js');
const Media = require('./media.js');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'variable');
var TYPE = 'variable';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get profile. " + error);
	process.exit();
}
/*--------------------------------------------------------------------------------------------
		Variable
---------------------------------------------------------------------------------------------*/
class Variable {
	constructor(apiCore) {
        this.apiCore = apiCore;
		this.profile = PROFILE;
		this.type = TYPE;
		this.generic = new Generic(this.apiCore, this.type, this.profile, this.getCreateInfo);
    }
    async getCreateInfo(data) {
		const caller = 'getCreateInfo';
		var createData = {...PROFILE.createData};
		createData.title = data.name;
		if(data.description)
			createData.description = data.description;
		createData.type = data.type;
        if(data.type == 'text') {
			logger.log(caller, 'INFO2', 'Create text variable');
            createData.value = data.value;
			createData.value_text = data.value;
			var createInfo = {createData: createData, urlPath: null};
        } else if(data.type == 'image') {
			logger.log(caller, 'INFO2', 'Create image variable');
			if(data.imgLibraryName) { //For using an image already in media library
				var media = new Media(this.apiCore);
				var mediaData = {name: data.imgLibraryName};
				try {
					let result = await media.getId(mediaData);
					if(!result.ok)
						logger.log(caller, 'ERROR', 'ERROR: media.getId result is ko');
					else
						var mediaId = result.data;
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: media.getId failed');
					return {ok: false};
				}
				createData.value_bm = mediaId;
				createData.value = '';
				var createInfo = {createData: createData, urlPath: null};
			} else if(data.imgName) { //For uploading a new image
				logger.log(caller, 'ERROR', 'ERROR: Not implemented');
				return {ok: false};
			} else {
				logger.log(caller, 'ERROR', 'ERROR: imgLibraryName or imgName is missing');
				return {ok: false};
			}
		} else {
			logger.log(caller, 'ERROR', 'ERROR: Type not supported: ' + data.type);
			return {ok: false};
		}
		return {ok: true, data: createInfo};
    }
    async modify(data) {
		var caller = 'modify';
        var item = {type: TYPE, profile: PROFILE, data: data};
		//First get variable info
		try {
			let result = await this.apiCore.getItemByName(item);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: apiCore.getItemByName result is ko');
				return result;
			}
			var variableData = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemByName failed');
			return {ok: false};
		}
		var urlPath = '/' + variableData.id;
		logger.log(caller, 'DEBUG', 'urlPath: ' + urlPath);
		var headers = {};
		//Modify the current variable with new value
		switch(variableData.type) {
			case 'text':
				logger.log(caller, 'INFO2', 'Modify text variable');
				var sentData = {
					id: variableData.id,
					link: '#variable/' + variableData.id,
					description: variableData.description,
					resource_name: null,
					type: variableData.type,
					title: variableData.title,
					value: item.data.value,
					value_text: item.data.value
				};
				if(item.data.description)
					sentData.description = item.data.description;
				var sentForm;
				//Now modify the variable
				var cmd = item.profile.cmdList[item.profile.cmd.put];
				try {
					let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
					if(!result.ok)
						logger.log(caller, 'DEBUG', 'ERROR: apiCore.executeCmd result is ko');
					return result;
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
					return {ok: false};
				}
				break;
			case 'image':
				logger.log(caller, 'INFO2', 'Modify image variable');
				if(data.imgLibraryName) { //Using an image already in media library
					//Get image media id
					var media = new Media(this.apiCore);
					var mediaData = {name: data.imgLibraryName};
					try {
						let result = await media.getId(mediaData);
						if(!result.ok)
							logger.log(caller, 'DEBUG', 'ERROR: media.getId result is ko');
						else
							var mediaId = result.data;
					} catch(error) {
						logger.log(caller, 'ERROR', 'ERROR: media.getId failed');
						return {ok: false};
					}
					//Update data with id of new image
					var sentData = {
						...variableData,
						change_img_value: 1,
						value_bm: mediaId
					};
				} else if(data.imgName) { //Uploading a new image
					//First upload the image
					var mediaFileDesc = {
						path: data.path,
						uploadData: {name: data.imgName}
					}
					try {
						let result = await this.apiCore.uploadFile(mediaFileDesc);
						if(!result.ok) {
							logger.log(caller, 'DEBUG', 'ERROR: apiCore.uploadFile result is ko');
							return result;
						}
						var uploadData = result.data;
					} catch(error) {
						logger.log(caller, 'ERROR', 'ERROR: apiCore.uploadFile failed');
						return {ok: false};
					}
					logger.log(caller, 'INFO2', "Media file uploaded: " + mediaFileDesc.path);
					logger.log(caller, 'INFO2', "Media url: " + uploadData.url);
					//Update data with new image url
					var sentData = {
						...variableData,
						change_img_value: 1,
						status: "done",
						upload: {received: uploadData.size, received: uploadData.size, progress: 100},
						value_upload: uploadData.url,
						timeImg: Date.now()
					};
				}
				if(item.data.description)
					sentData.description = item.data.description;
				var sentForm;
				//Now modify the variable with the new image
				var cmd = item.profile.cmdList[item.profile.cmd.put];
				try {
					let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
					if(!result.ok)
						logger.log(caller, 'DEBUG', 'ERROR: apiCore.executeCmd result is ko');
					return result;
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
					return {ok: false};
				}
				break;
			default:
				logger.log(caller, 'ERROR', "ERROR: variable type not supported: " + error);
				throw new Error('Cannot modify variable');
				break;
		}
	}
	async checkData(data) {return await this.generic.checkData(data).catch((error) => {logger.log('checkData', 'ERROR', 'ERROR: generic.checkData failed'); return {ok: false};})};
	async create(data) {return await this.generic.create(data).catch((error) => {logger.log('create', 'ERROR', 'ERROR: generic.create failed'); return {ok: false};})};
	async delete(data) {return await this.generic.delete(data).catch((error) => {logger.log('delete', 'ERROR', 'ERROR: generic.delete failed'); return {ok: false};})};
    async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); return {ok: false};})};
	async getData(data) {return await this.generic.getData(data).catch((error) => {logger.log('getData', 'ERROR', 'ERROR: generic.getData failed'); return {ok: false};})};
	async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); return {ok: false};})};
}
module.exports = Variable;