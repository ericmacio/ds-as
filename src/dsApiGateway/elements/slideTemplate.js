const Generic = require('./Generic.js');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'slideTemplate');
var TYPE = 'slideTemplate';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get profile. " + error);
	process.exit();
}
/*--------------------------------------------------------------------------------------------
		SlideTemplate
---------------------------------------------------------------------------------------------*/
class SlideTemplate {
	constructor(apiCore) {
        this.apiCore = apiCore;
		this.type = TYPE;
		this.profile = PROFILE;
		this.generic = new Generic(this.apiCore, this.type, this.profile, null);
    }
    async upload(data) {
        const caller = 'upload';
		this.postTemplates = async(xmlData, pgzData, imgData) => {
			if(xmlData && pgzData && imgData) {
				var urlPath;
				var headers = {};
				var sentData = {
					category: [data.type],
					link: "#templates/undefined",
					title: data.name,
					status: "done",
					upload:{
						received: 132149,
						size: 132149,
						progress: 100
					},
					xml_upload: xmlData.url,
					xml_name: xmlData.name,
					media_upload: pgzData.url,
					media_name: pgzData.name,
					image_upload: imgData.url,
					image_name: imgData.name,
					description: ""
				};
				var sentForm;
				var cmd = this.profile.cmdList[this.profile.cmd.post];
				try {
					let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
					if(!result.ok)
						logger.log(caller, 'DEBUG', 'ERROR: apiCore.executeCmd result is ko');
					return result;
				} catch(error) {
					logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
					return {ok: false};
				}
			} else {
				logger.log(caller, 'ERROR', 'ERROR: Some files are missing');
				throw new Error ('Files missing (xml, pgz, img) for layout template')
			}
		}
		this.uploadFile = async(data, type) => {
			//Upload file
			const fileUrl = data.url ? data.url + '.' + type : null;
			const filePath = data.src ? data.src + '.' + type : null;
			const fileName = (type == 'jpg') ? data.name + '-img' : data.name + '-' + type;
			logger.log(caller, 'INFO2', 'fileName: ' + fileName);
			logger.log(caller, 'DEBUG', 'upload file type: ' + type);
			var fileDesc = {
				name: fileName,
				path: filePath,
				url: fileUrl,
				uploadData: {name: fileName},
				type: type,
				downloadUrlName: data.name
			}
			try {
				let result = await this.apiCore.uploadFile(fileDesc);
				if(!result.ok) {
					logger.log(caller, 'DEBUG', 'ERROR: apiCore.uploadFile result is ko');
					return result;
				}
				logger.log(caller, 'INFO1', type + ' file uploaded completed');
				return {ok: true, data: {type: type, fileData: result.data}};
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
				logger.error(caller, error);
				return {ok: false};
			}
		}
		var uploadFunc = [this.uploadFile(data, 'xml'), this.uploadFile(data, 'pgz'), this.uploadFile(data, 'jpg')];
		try {
			const resultList = await Promise.all(uploadFunc);
			logger.log(caller, 'INFO1', 'Init resultList length: ' + resultList.length);
			//Now check the global status and return if error
			var fileData = new Object();
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
		return await this.postTemplates(fileData['xml'], fileData['pgz'], fileData['jpg']);
	}
	async delete(data) {return await this.generic.delete(data).catch((error) => {logger.log('delete', 'ERROR', 'ERROR: generic.delete failed'); logger.error(caller, error); return {ok: false};})};
    async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); logger.error(caller, error); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); logger.error(caller, error); return {ok: false};})};
    async getData(data) {return await this.generic.getData(data).catch((error) => {logger.log('getData', 'ERROR', 'ERROR: generic.getData failed'); logger.error(caller, error); return {ok: false};})};
    async getContent(data) {return await this.generic.getContent(data).catch((error) => {logger.log('getContent', 'ERROR', 'ERROR: generic.getContent failed'); logger.error(caller, error); return {ok: false};})};
	async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); logger.error(caller, error); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); logger.error(caller, error); return {ok: false};})};
}
module.exports = SlideTemplate;