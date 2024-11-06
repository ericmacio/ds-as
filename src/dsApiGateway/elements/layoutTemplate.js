const Generic = require('./Generic.js');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'layoutTemplate');
const TYPE = 'layoutTemplate';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get profile. " + error);
	logger.error(caller, error);
	process.exit();
}
/*--------------------------------------------------------------------------------------------
		LayoutTemplate
---------------------------------------------------------------------------------------------*/
class LayoutTemplate {
	constructor(apiCore) {
		var caller = 'LayoutTemplate';
        this.apiCore = apiCore;
		this.profile = PROFILE;
		this.type = TYPE;
		this.generic = new Generic(this.apiCore, this.type, this.profile, null);
    }
    async upload(data) {
        var caller = 'upload';
		this.postLayoutTemplates = async(xmlData, sczData, imgData) => {
			if(xmlData && sczData && imgData) {
				var urlPath;
				var headers = {};
				var sentData = {
					link: "#layouts/undefined",
					title: data.name,
					status: "done",
					upload:{
						received: 132149,
						size: 132149,
						progress: 100
					},
					xml_upload: xmlData.url,
					xml_name: xmlData.name,
					media_upload: sczData.url,
					media_name: sczData.name,
					image_upload: imgData.url,
					image_name: imgData.name,
					description: ""
				};
				var sentForm;
				var cmd = PROFILE.cmdList[PROFILE.cmd.post];
				try {
					let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
					if(!result.ok)
						logger.log(caller, 'DEBUG', 'ERROR: apiCore.executeCmd result is ko');
					return result;
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
					logger.error(caller, error);
					return {ok: false};
				}
			} else {
				logger.log(caller, 'ERROR', 'ERROR: Some files are missing');
				throw new Error ('Files missing (xml, scz, img) for layout template')
			}
		}
		this.uploadFile = async(data, type) => {
			//Upload file
			const fileUrl = data.url ? data.url + '.' + type : null;
			const filePath = data.src ? data.src + '.' + type : null;
			var fileName = (type == 'jpg') ? data.name + '-img' : data.name + '-' + type;
			logger.log(caller, 'INFO2', 'fileName: ' + fileName);
			logger.log(caller, 'DEBUG', 'upload file type: ' + type);
			var fileDesc = {
				name: fileName,
				path: filePath,
				url: fileUrl,
				uploadData: {name: fileName}
			}
			try {
				let result = await this.apiCore.uploadFile(fileDesc);
				if(!result.ok) {
					logger.log(caller, 'DEBUG', 'ERROR: apiCore.uploadFile result is ko');
					return result;
				}
				logger.log(caller, 'INFO1', 'File uploaded: ' + filePath);
				return {ok: true, data: {type: type, fileData: result.data}};
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
				logger.error(caller, error);
				return {ok: false};
			}
		}
		var uploadFunc = [this.uploadFile(data, 'xml'), this.uploadFile(data, 'scz'), this.uploadFile(data, 'jpg')];
		try {
			const resultList = await Promise.all(uploadFunc);
			//Now check the global status and return if error
			var fileData = new Object();
			//Now check the global status and return if error
			var allOk = true;
			for(let id=0; id<resultList.length; id++) {
				if(!resultList[id].ok) {
					logger.log(caller, 'ERROR', 'ERROR: result is ko for id: ' + id + ', result: ' + resultList[id].ok); 
					allOk = false;
				} else
					fileData[resultList[id].data.type] = resultList[id].data.fileData;
			}
			if(!allOk) return {ok: false};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for uploadFunc. ' + error);
			logger.error(caller, error);
			return {ok: false};
		}
		return await this.postLayoutTemplates(fileData['xml'], fileData['scz'], fileData['jpg']);
	}
	async delete(data) {return await this.generic.delete(data).catch((error) => {logger.log('delete', 'ERROR', 'ERROR: generic.delete failed'); logger.error(caller, error); return {ok: false};})};
    async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); logger.error(caller, error); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); logger.error(caller, error); return {ok: false};})};
    async getData(data) {return await this.generic.getData(data).catch((error) => {logger.log('getData', 'ERROR', 'ERROR: generic.getData failed'); logger.error(caller, error); return {ok: false};})};
    async getContent(data) {return await this.generic.getContent(data).catch((error) => {logger.log('getContent', 'ERROR', 'ERROR: generic.getContent failed'); logger.error(caller, error); return {ok: false};})};
	async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); logger.error(caller, error); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); logger.error(caller, error); return {ok: false};})};
}
module.exports = LayoutTemplate;