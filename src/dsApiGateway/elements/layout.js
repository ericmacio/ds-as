const Generic = require('./Generic.js');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'layout');
var LayoutTemplate = require('./layoutTemplate.js');
var Playlist = require('./playlist.js');
var TYPE = 'layout';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get profile. " + error);
	process.exit();
}
/*--------------------------------------------------------------------------------------------
		Layout
---------------------------------------------------------------------------------------------*/
class Layout {
	constructor(apiCore) {
        this.apiCore = apiCore;
		this.profile = PROFILE;
		this.type = TYPE;
		this.generic = new Generic(this.apiCore, this.type, this.profile, null);
    }
    async create(data) {
		var caller = 'create';
		//Get Layout template id
		var layoutTemplate = new LayoutTemplate(this.apiCore);
		try {
			let result = await layoutTemplate.getId({name: data.template});
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: layout.getId result is ko');
				return result;
			}
			var layoutTemplateId = result.data;
			logger.log(caller, 'DEBUG', 'Template id: ' + layoutTemplateId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: layout.getId failed');
			return {ok: false};
		}
		//Generate Layout from template
		try {
			let result = await generateLayoutFromTemplate(this.apiCore, layoutTemplateId, data.name);
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: generateLayoutFromTemplate result is ko');
			else
				logger.log(caller, 'INFO1', 'Layout successfully generated: ' + data.name);
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: generateLayoutFromTemplate failed');
			return {ok: false};
		}
	}
	async generateAll(data) {
		var caller = 'generateAll';
		try {
			let result = await this.list(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: list result is ko');
				return result;
			}
			var layoutList = result.data;
			logger.log(caller, 'INFO0', 'layoutList length: ' + layoutList.length);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: list failed');
			return {ok: false};
		}
		var generateFunct = layoutList.map((layout) => {this.generate({name: layout.title});});
		try {
			const resultList = await Promise.all(generateFunct);
			logger.log(caller, 'INFO1', 'Init resultList length: ' + resultList.length);
			//Now check the global status
			var allOk = true;
			for(let id=0; id<resultList.length; id++) {
				if(!resultList[id].ok) {
					logger.log(caller, 'ERROR', 'ERROR: result is ko for id: ' + id + ', result: ' + resultList[id].ok); 
					allOk = false;
				}
			}
			return {ok: allOk};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for generateFunct. ' + error);
			return {ok: false};
		}
	}
	async generate(data) {
		var caller = 'generate';
		try {
			let result = await this.getContent(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: getContent result is ko');
				return result;
			}
			var layoutContent = result.data;
			logger.log(caller, 'INFO2', 'layoutContent Items length: ' + layoutContent.Items.Item.length);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getContent failed');
			return {ok: false};
		}
		try {
			let result = await this.getId(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: getId result is ko');
				return result;
			}
			var layoutId = result.data;
			logger.log(caller, 'INFO2', 'layoutId: ' + layoutId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getId failed');
			return {ok: false};
		}
		//setBroadcastArea
		const setBroadcastArea = async(layoutContent, broadcastArea) => {
			var found = false;
			var itemId;
			for(let id=0; id<layoutContent.Items.Item.length; id++) {
				if(layoutContent.Items.Item[id].Name == broadcastArea.name) {
					logger.log(caller, 'INFO2', 'Found broadcast area: ' + broadcastArea.name);
					found = true;
					itemId = id;
					break;
				}
			}
			if(!found) {
				logger.log(caller, 'ERROR', 'ERROR: Broadcast area not found: ' + broadcastArea.name);
				return {ok: false};
			}
			var playlist = new Playlist(this.apiCore);
			//Get playlist id
			try {
				var result = await playlist.getId({name: broadcastArea.playlist});
				if(!result.ok) {
					logger.log(caller, 'DEBUG', 'ERROR: playlist.getId result is ko');
					return result;
				}
				var playlistId = result.data;
				logger.log(caller, 'DEBUG', 'Item id: ' + itemId);
				logger.log(caller, 'DEBUG', 'Playlist id: ' + playlistId);
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: playlist.getId failed');
				return {ok: false};
			}
			//Update layoutContent
			layoutContent.Items.Item[itemId].Modified = 1;
			layoutContent.Items.Item[itemId].Content.Modified = 1;
			layoutContent.Items.Item[itemId].Content.Insert_id = playlistId.toString();
			layoutContent.Items.Item[itemId]['Content.Insert_id'] = playlistId;
			return {ok: true};
		}
		//Set all broadcast area
		if(data.broadcastAreaList) {
			logger.log(caller, 'INFO2', 'broadcastArea length: ' + data.broadcastAreaList.length);
			var setBroadcastAreaList = data.broadcastAreaList.map((broadcastArea) => {return setBroadcastArea(layoutContent, broadcastArea)});
			try {
				const resultList = await Promise.all(setBroadcastAreaList);
				logger.log(caller, 'INFO2', 'Init resultList length: ' + resultList.length);
				//Now check the global status and return if error
				var allOk = resultList.reduce((ok, result, id) => {
					if(!result.ok) logger.log(caller, 'ERROR', 'ERROR: result is ko for id: ' + id); 
					return (ok && result.ok)
				}, true);
				if(!allOk) return {ok: false};
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: Promise.all failed for setBroadcastAreaList. ' + error);
				return {ok: false};
			}
		}
		//Generate layout
		var headers = {};
		var urlPath = '/' + layoutId;
		var sentData = {xml_content: layoutContent, new_zone: 0}
		var sentForm;
		var cmd = PROFILE.cmdList[PROFILE.cmd.generate];
		try {
			let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: apiCore.executeCmd result is ko');
				return result;
			}
			var serverData = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
			return {ok: false};
		}
		//Validate generation
		var headers = {};
		var urlPath = '/' + layoutId;
		var sentData = {preview_file: serverData.preview_file};
		var sentForm;
		var cmd = PROFILE.cmdList[PROFILE.cmd.validateGeneration];
		try {
			let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: apiCore.executeCmd result is ko');
			else
				logger.log(caller, 'INFO0', 'Layout ' + data.name + ' has been generated');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
			return {ok: false};
		}
	}
	async delete(data) {return await this.generic.delete(data).catch((error) => {logger.log('delete', 'ERROR', 'ERROR: generic.delete failed'); return {ok: false};})};
    async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); return {ok: false};})};
    async getData(data) {return await this.generic.getData(data).catch((error) => {logger.log('getData', 'ERROR', 'ERROR: generic.getData failed'); return {ok: false};})};
    async getContent(data) {return await this.generic.getContent(data).catch((error) => {logger.log('getContent', 'ERROR', 'ERROR: generic.getContent failed'); return {ok: false};})};
	async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); return {ok: false};})};
}
module.exports = Layout;
/*--------------------------------------------------------------------------------------------
		generateLayoutFromTemplate
---------------------------------------------------------------------------------------------*/
async function generateLayoutFromTemplate(apiCore, templateId, layoutName) {
	var caller = 'generateLayoutFromTemplate';
	var urlPath;
	var headers = {};
	var sentData = {
		link: '#layout/undefined',
		template_id: templateId,
		title: layoutName,
		description: ''
	}
	var sentForm;
	var cmd = PROFILE.cmdList[PROFILE.cmd.post];
	try {
		let result = await apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
		if(!result.ok)
			logger.log(caller, 'DEBUG', 'ERROR: apiCore.executeCmd result is ko');
		return result;
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
		return {ok: false};
	}
}