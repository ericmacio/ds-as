const Generic = require('./Generic.js');
const Media = require('./media.js');
const Layout = require('./layout.js');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'channel');
const TYPE = 'channel';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get profile. " + error);
	logger.error(caller, error);
	process.exit();
}
/*--------------------------------------------------------------------------------------------
		Channel
---------------------------------------------------------------------------------------------*/
class Channel {
	constructor(apiCore) {
		var caller = 'Channel';
		this.apiCore = apiCore;
		this.profile = PROFILE;
		this.type = TYPE;
		this.generic = new Generic(this.apiCore, this.type, this.profile, this.getCreateInfo);
		this.apiList = [];
	}
	//getCreateInfo - Called when creating a new channel
    async getCreateInfo(data) {
		var caller = 'getCreateInfo';
        var createData = { ...PROFILE.createData };
        createData.channelName = data.name;
		createData.description = data.description;
		var createInfo = {createData: createData, urlPath: null};
        return {ok: true, data: createInfo};
	}
	//associateDevice - Associate a channel to a set of devices
    async associateDevice(data) {
        var caller = 'associateDevice';
        logger.log(caller, 'INFO1', 'Nb devices: ' + data.deviceList.length);
        var devicesName =  'Devices: ' + data.deviceList[0];
        for(var id=1; id<data.deviceList.length; id++)
            devicesName +=  ', ' + data.deviceList[id];
		var item = {type: TYPE, profile: PROFILE, data: data};
		try {
			var result = await putDeviceChannel(this.apiCore, item);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: putDeviceChannel result is ko');
				return result;
			}
			logger.log(caller, 'INFO1', 'Channel ' + item.data.name + ' assigned to devices:');
            logger.log(caller, 'INFO1', devicesName);
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: putDeviceChannel failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	async uploadContent(data) {
		var caller = 'uploadContent';
		//Get channel id
		try {
			var result = await this.getId(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: getId result is ko');
				return result;
			}
			var channelId = result.data;
			logger.log(caller, 'DEBUG', 'Channel id: ' + channelId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getId failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Upload media into channel
		var media = new Media(this.apiCore);
		var mediaData = {name: data.contentName, src: data.src, url: data.url, channelId: channelId};
		try {
			var result = await media.upload(mediaData);
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: media.upload result is ko');
			else
				logger.log(caller, 'INFO1', 'Media ' + data.src + ' uploaded successfully into channel ' + data.name);
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: media.upload failed');
			logger.error(caller, error);
			return {ok: false};
		}	
	}
	async defaultLayout(data) {
		var caller = 'setDefaultLayout';
		//Get channel id
		try {
			let result = await this.getId(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: getId result is ko');
				return result;
			}
			var channelId = result.data;
			logger.log(caller, 'DEBUG', 'Channel id: ' + channelId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getId failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Get Layout id
		var layout = new Layout(this.apiCore);
		try {
			let result = await layout.getId({name: data.layout});
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: layout.getId result is ko');
				return result;
			}
			var layoutId = result.data;
			logger.log(caller, 'DEBUG', 'Layout id: ' + layoutId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: layout.getId failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Set default layout
		var urlPath = '/' + channelId, headers = {}, sentData = {layout_id: layoutId}, sentForm;
		if(data.value == 'set')
			var cmdName = this.profile.cmd.putDefaultLayout;
		else if(data.value == 'unset')
			var cmdName = this.profile.cmd.deleteDefaultLayout;
		else {
			logger.log(caller, 'ERROR', 'ERROR: bad value: ' + data.value);
			throw new Error('Cannot set layout to channel');
		}
		var cmd = this.profile.cmdList[cmdName];
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
	}
	async elementLayout(data) {
		var caller = 'setElementLayout';
		//Get channel id
		try {
			let result = await this.getId(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: getId result is ko');
				return result;
			}
			var channelId = result.data;
			logger.log(caller, 'DEBUG', 'Channel id: ' + channelId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getId failed');
			logger.error(caller, error);
			return {ok: false};
		}
		try {
			let result = await this.getContent(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: getContent result is ko');
				return result;
			}
			var channelContent = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getContent failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Get element id
		var found = false;
		var elementId;
		for(var id=0; id<channelContent.length; id++) {
			var content = channelContent[id];
			if(content.title == data.element) {
				found = true;
				elementId = content.id;
				break;
			}
		}
		if(!found) {
			logger.log(caller, 'ERROR', 'ERROR: element [' + data.element + '] not found in channel [' + data.name + '].');
			throw new Error('Element not found');
		}
		//Get layout id
		var layout = new Layout(this.apiCore);
		try {
			let result = await layout.getId({name: data.layout});
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: layout.getId result is ko');
				return result;
			}
			var layoutId = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: layout.getId failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Set element layou
		var urlPath = '/' + channelId + '/' + elementId, headers = {}, sentData = {layout_id: layoutId}, sentForm;
		if(data.value == 'set')
			var cmdName = this.profile.cmd.putElementLayout;
		else if(data.value == 'unset')
			var cmdName = this.profile.cmd.deleteElementLayout;
		else {
			logger.log(caller, 'ERROR', 'ERROR: bad value: ' + data.value);
			throw new Error('cannot set element layout');
		}
		var cmd = this.profile.cmdList[cmdName];
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
	}
	async checkElement(data) {
		var caller = 'checkElement';
		//Get channel content
		try {
			let result = await this.getContent(data);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: getContent result is ko');
				return result;
			}
			var channelContent = result.data;
			//Look for element from channel content
			var found = false;
			var element;
			var checkOk = true;
			for(var id=0; id<channelContent.length; id++) {
				if(channelContent[id].title == data.element) {
					found = true;
					element = channelContent[id];
					break;
				}
			}
			if(!found) {
				logger.log(caller, 'ERROR', 'ERROR: element [' + data.element + '] not found in channel content [' + channel + '].');
				throw new Error('Element not found');
			}
			for(var key in data.check) {
				if(element[key] != data.check[key]) {
					logger.log(caller, 'ERROR', 'ERROR: element check failed for ' + key + '. Expected: ' + data.check[key] + ', got: ' + element[key]);
                    checkOk = false;
                }
			}
			return {ok: checkOk};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getContent failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	async checkContentList(data) {return await this.generic.checkContentList(data).catch((error) => {logger.log('checkContentList', 'ERROR', 'ERROR: generic.checkContentList failed'); logger.error(caller, error); return {ok: false};})};
	async checkContentNb(data) {return await this.generic.checkContentNb(data).catch((error) => {logger.log('checkContentNb', 'ERROR', 'ERROR: generic.checkContentNb failed'); logger.error(caller, error); return {ok: false};})};
	async checkData(data) {return await this.generic.checkData(data).catch((error) => {logger.log('checkData', 'ERROR', 'ERROR: generic.checkData failed'); logger.error(caller, error); return {ok: false};})};
	async create(data) {return await this.generic.create(data).catch((error) => {logger.log('create', 'ERROR', 'ERROR: generic.create failed'); logger.error(caller, error); return {ok: false};})};
	async delete(data) {return await this.generic.delete(data).catch((error) => {logger.log('delete', 'ERROR', 'ERROR: generic.delete failed'); logger.error(caller, error); return {ok: false};})};
	async deleteContent(data) {return await this.generic.deleteContent(data).catch((error) => {logger.log('deleteContent', 'ERROR', 'ERROR: generic.deleteContent failed'); logger.error(caller, error); return {ok: false};})};
	async deleteFromId(data) {return await this.generic.deleteFromId(data).catch((error) => {logger.log('deleteFromId', 'ERROR', 'ERROR: generic.deleteFromId failed'); logger.error(caller, error); return {ok: false};})};
	async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); logger.error(caller, error); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); logger.error(caller, error); return {ok: false};})};
	async getContent(data) {return await this.generic.getContent(data).catch((error) => {logger.log('getContent', 'ERROR', 'ERROR: generic.getContent failed'); logger.error(caller, error); return {ok: false};})};
	async getContentById(data) {return await this.generic.getContentById(data).catch((error) => {logger.log('getContent', 'ERROR', 'ERROR: generic.getContent failed'); logger.error(caller, error); return {ok: false};})};
	async getData(data) {return await this.generic.getData(data).catch((error) => {logger.log('getData', 'ERROR', 'ERROR: generic.getData failed'); logger.error(caller, error); return {ok: false};})};
	async getDataById(data) {return await this.generic.getDataById(data).catch((error) => {logger.log('getDataById', 'ERROR', 'ERROR: generic.getDataById failed'); logger.error(caller, error); return {ok: false};})};
	async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); logger.error(caller, error); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); logger.error(caller, error); return {ok: false};})};
	async postContent(data) {return await this.generic.postContent(data).catch((error) => {logger.log('postContent', 'ERROR', 'ERROR: generic.postContent failed'); logger.error(caller, error); return {ok: false};})};
	async postContentFromId(data) {return await this.generic.postContentFromId(data).catch((error) => {logger.log('postContentFromId', 'ERROR', 'ERROR: generic.postContentFromId failed'); logger.error(caller, error); return {ok: false};})};
	async postSynchro(data) {return await this.generic.postSynchro(data).catch((error) => {logger.log('postSynchro', 'ERROR', 'ERROR: generic.postSynchro failed'); logger.error(caller, error); return {ok: false};})};
	async publish(data) {return await this.generic.publish(data).catch((error) => {logger.log('publish', 'ERROR', 'ERROR: generic.publish failed'); logger.error(caller, error); return {ok: false};})};
	async publishById(data) {return await this.generic.publishById(data).catch((error) => {logger.log('publish', 'ERROR', 'ERROR: generic.publish failed'); logger.error(caller, error); return {ok: false};})};
}
module.exports = Channel;
/*--------------------------------------------------------------------------------------------
		putDeviceChannel
---------------------------------------------------------------------------------------------*/
async function putDeviceChannel(apiCore, item) {
	var caller = 'putDeviceChannel';
    //Get device profile
    try {
        var deviceProfile = require('./device.json');
    } catch(error) {
        logger.log('server', 'ERROR', "ERROR: Cannot get device profile. " + error);
	    return callback(error);
	}
	//Get information about devices
	var deviceItem = {type: 'device', profile: deviceProfile};
	try {
		let result = await apiCore.getItemListByNameList(deviceItem, item.data.deviceList);
		if(!result.ok) {
			logger.log(caller, 'DEBUG', 'ERROR: apiCore.getItemListByNameList result is ko');
			return result;
		}
		var deviceList = result.data;
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemListByNameList failed');
		return {ok: false};
	}
	//Get channel data
	try {
		let result = await apiCore.getItemByName(item);
		if(!result.ok) {
			logger.log(caller, 'DEBUG', 'ERROR: apiCore.getItemByName result is ko');
			return result;
		}
		var channelData = result.data;
		var channelId = channelData.id;
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemByName failed');
		return {ok: false};
	}
	var headers = {};
	var sentData = 'channel_id=' + channelId;
	var sentForm;
	var cmd = item.profile.cmdList[item.profile.cmd.putDevice];
	logger.log(caller, 'DEBUG', 'Device list.length: ' + deviceList.length);
	async function setDeviceChannel(deviceId) {
		var urlPath = '/' + deviceId;
		try {
			let result = await apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed for cmd: ' + cmd);
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	var setDeviceChannelList = deviceList.map((device) => {return setDeviceChannel(device.id)});
	try {
		const resultList = await Promise.all(setDeviceChannelList);
		logger.log(caller, 'INFO2', 'Init resultList length: ' + resultList.length);
		//Now check the global status
		var allOk = true;
		for(let id=0; id<resultList.length; id++)
			if(!resultList[id].ok) {
				logger.log(caller, 'ERROR', 'ERROR: result is ko for id: ' + id + ', result: ' + resultList[id].ok); 
				allOk = false;
			}
		return {ok: allOk};
	} catch(error) {
		logger.log(caller, 'ERROR', 'ERROR: setDeviceChannelList failed');
		logger.error(caller, error);
		return {ok: false};
	}
}