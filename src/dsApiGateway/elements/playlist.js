const Generic = require('./Generic.js');
var Media = require('./media.js');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'playlist');
var TYPE = 'playlist';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', 'ERROR: Cannot get profile. ' + error);
	process.exit();
}
/*--------------------------------------------------------------------------------------------
		Playlist
---------------------------------------------------------------------------------------------*/
class Playlist {
    constructor(apiCore) {
        this.apiCore = apiCore;
        this.type = TYPE;
        this.profile = PROFILE;
        this.generic = new Generic(this.apiCore, this.type, this.profile, this.getCreateInfo);
    }
    async getCreateInfo(data) {
        var createData = { ...this.profile.createData };
        createData.title = data.name;
        createData.description = data.description;
        createData.resource_name = data.resource_name;
        var createInfo = {createData: createData, urlPath: null};
        return {ok: true, data: createInfo};
    }
    async uploadContent(data) {
        var caller = 'uploadContent';
        logger.log(caller, 'INFO1', 'getId for playlist ' + data.name);
        try {
			var result = await this.getId(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getId result is ko');
				return result;
			}
			data.id = result.data;
			logger.log(caller, 'INFO2', 'Playlist id: ' + data.id);
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: getId failed');
            logger.error(caller, error);
			return {ok: false};
		}
        //Upload media from playlist id
        try {
            var result = await this.uploadContentById(data);
            if(!result.ok)
                logger.log(caller, 'INFO2', 'ERROR: uploadContentById result is ko');
            else
                logger.log(caller, 'INFO1', 'Media ' + data.contentName + ' uploaded successfully into playlist ' + data.name);
            return result;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: uploadContentById failed');
            return {ok: false};
        }
    }
    async uploadContentById(data) {
        var caller = 'uploadContentById';
        var media = new Media(this.apiCore);
        var mediaData = {name: data.contentName, src: data.src, url: data.url, playlistId: data.id};
        try {
            var result = await media.upload(mediaData);
            if(!result.ok)
                logger.log(caller, 'INFO2', 'ERROR: media.upload result is ko');
            else
                logger.log(caller, 'INFO1', 'Media ' + data.contentName + ' uploaded successfully into playlist ' + data.name);
            return result;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: media.upload failed');
            return {ok: false};
        }
    }
    async deleteMultiContent(data) {
        var caller = 'deleteMultiContent';
        var playlistMediaIdList = [];
        logger.log(caller, 'INFO1', 'getId for playlist ' + data.name);
        //Get playlist id
        try {
			var result = await this.getId(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getId result is ko');
				return result;
			}
			var playlistId = result.data;
			logger.log(caller, 'INFO2', 'Playlist id: ' + playlistId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getId failed');
			return {ok: false};
        }
        //Get playlist content
        try {
			let result = await this.getContent(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getContent result is ko');
				return result;
			}
			var contentData = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getContent failed');
			return {ok: false};
		}
        var err = false;
        for(var mediaId=0; mediaId<data.mediaList.length; mediaId++) {
            var found = false;
            for(var contentId=0; contentId<contentData.length; contentId++) {
                logger.log(caller, 'DEBUG', JSON.stringify(contentData[contentId]));
                if(contentData[contentId].title == data.mediaList[mediaId]) {
                    found = true;
                    playlistMediaIdList[playlistMediaIdList.length] = {name: contentData[contentId].title, id: contentData[contentId].id};
                    break;
                }
            }
            if(!found) {
                logger.log(caller, 'ERROR', 'ERROR: media not found in playlist ' + data.name + ': ' + data.mediaList[mediaId]);
                err = true;
            } else
                logger.log(caller, 'INFO1', 'Media found in playlist ' + data.name + ': ' + data.mediaList[mediaId]);
        }
        logger.log(caller, 'INFO1', 'playlistMediaIdList length: ' + playlistMediaIdList.length);
        if(err)
            throw new Error('ERROR when parsing playlist content');
        data.playlistId = playlistId;
        data.mediaIdList = playlistMediaIdList;
        try {
            var result = await this.deleteMultiContentFromId(data);
            if(!result.ok)
                logger.log(caller, 'INFO2', 'ERROR: deleteMultiContentFromId result is ko');
            else
                logger.log(caller, 'INFO2', 'deleteMultiContentFromId successful');
			return result;
        } catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: deleteMultiContentFromId failed');
			return {ok: false};
		}
    }
    async deleteMultiContentFromId(data) {
        var caller = 'deleteMultiContentFromId';
        var urlPath = '/' + data.playlistId;
        var headers = {};
        var sentData = '';
        for(var id=0; id<data.mediaIdList.length; id++) {
            if(id == (data.mediaIdList.length-1))
                sentData += 'items[]=' + data.mediaIdList[id].id;
            else
                sentData += 'items[]=' + data.mediaIdList[id].id + '&';
        }
        logger.log(caller, 'DEBUG', 'sentData: ' + sentData.toString());
        var sentForm;
        if(sentData != '') {
            var cmd = this.profile.cmdList[this.profile.cmd.deleteMultiContent];
            try {
                let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
                if(!result.ok)
                    logger.log(caller, 'INFO2', 'ERROR: apiCore.executeCmd result is ko');
                return result;
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
                return {ok: false};
            }
        } else {
            logger.log(caller, 'INFO2', 'No media to delete from playlist');
            return {ok: true};
        }
    }
    async deviceRights(data) {
        var caller = 'deviceRights';
        //Get device profile information from config file
        try {
            var deviceProfile = require('./device.json');
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: Cannot get device profile');
            return callback(error);
        }
        //Get information about devices
        var deviceItem = {type: 'device', profile: deviceProfile};
        try {
            let result = await this.apiCore.getItemListByNameList(deviceItem, data.deviceList);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: apiCore.getItemListByNameList result is ko');
                return result;
            }
            var deviceList = result.data;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemListByNameList failed');
            return {ok: false};
        }
        //Get playlist data
        try {
			var result = await this.getData(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getData result is ko');
				return result;
			}
			var dsServerData = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getData failed');
			return {ok: false};
		}
        var playlistId = dsServerData.id;
        var urlPath = '/' + playlistId;
        var headers = {};
        var sentData = new Object();
        sentData.resource_name = dsServerData.resource_name;
        sentData.title = dsServerData.title;
        sentData.id = dsServerData.id;
        sentData.content_type = dsServerData.content_type;
        sentData.version = dsServerData.version;
        sentData.next_version = dsServerData.next_version;
        sentData.rights_groupdevices = dsServerData.rights_groupdevices;
        sentData.rights_groupusers = dsServerData.rights_groupusers;
        sentData.rights_managers = dsServerData.rights_managers;
        sentData.rights_products = dsServerData.rights_products;
        sentData.rights_users = dsServerData.rights_users;
        sentData.rights_devices = dsServerData.rights_devices;
        for(var id=0; id<deviceList.length; id++) {
            var found = false;
            for(var deviceId=0; deviceId<sentData.rights_devices.length; deviceId++) {
                if(deviceList[id].id == sentData.rights_devices[deviceId].id) {
                    found = true;
                    break;
                }
            }
            if(!found) {
                logger.log(caller, 'INFO1', 'Device not found: ' + deviceList[id].title);
                if(data.value == 'unset') {
                    logger.log(caller, 'WARNING', 'WARNING: rights not set for ' + deviceList[id].title);
                } else if(data.value == 'set') {
                    //Add device to the list
                    sentData.rights_devices.push({id: deviceList[id].id, is_group_right: false});
                    logger.log(caller, 'INFO1', 'Rights set for ' + deviceList[id].title);
                } else
                    logger.log(caller, 'WARNING', 'WARNING: unexpected situation for not found device');
            } else {
                logger.log(caller, 'INFO1', 'Device found: ' + deviceList[id].title);
                if(data.value == 'unset') {
                    //Remove device from the rights list
                    sentData.rights_devices.splice(deviceId, 1);
                    logger.log(caller, 'INFO1', 'Rights unset for ' + deviceList[id].title);
                } else if(data.value == 'set') {
                    logger.log(caller, 'WARNING', 'WARNING: rights already set for ' + deviceList[id].title);
                } else
                    logger.log(caller, 'WARNING', 'WARNING: unexpected situation for found device');
            }
        }
        var sentForm;
        var cmd = this.profile.cmdList[this.profile.cmd.putRights];
        try {
			let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.executeCmd result is ko');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
			return {ok: false};
		}
    }
    async checkRights(data) {
        var caller = 'checkRights';
        //Get device profile information from config file
        try {
            var deviceProfile = require('./device.json');
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: Cannot get device profile');
            return callback(error);
        }
        //Get information about devices
        var deviceItem = {type: 'device', profile: deviceProfile};
        try {
            let result = await this.apiCore.getItemListByNameList(deviceItem, data.deviceList);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: apiCore.getItemListByNameList result is ko');
                return result;
            }
            var deviceList = result.data;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemListByNameList failed');
            return {ok: false};
        }
        //Get playlist data
        try {
			var result = await this.getData(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getData result is ko');
				return result;
			}
			var dsServerData = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getData failed');
			return {ok: false};
		}
        logger.log(caller, 'INFO2', 'device list length: ' + deviceList.length);
        logger.log(caller, 'INFO2', 'rights_devices length: ' + dsServerData.rights_devices.length);
        var checkOk = true;
        for(var id=0; id<deviceList.length; id++) {
            var found = false;
            for(var deviceId=0; deviceId<dsServerData.rights_devices.length; deviceId++) {
                if(deviceList[id].id == dsServerData.rights_devices[deviceId].id) {
                    found = true;
                    break;
                }
            }
            if(!found) {
                if (data.value == 'set') {
                    logger.log(caller, 'ERROR', 'ERROR: rights not set for ' + deviceList[id].title);
                    checkOk = false;
                    break;
                } else
                    logger.log(caller, 'INFO1', 'Ok. Rights are not set for ' + deviceList[id].title);
            } else if(data.value == 'unset') {
                logger.log(caller, 'ERROR', 'ERROR: rights set for ' + deviceList[id].title);
                checkOk = false;
                break;
            } else
                logger.log(caller, 'INFO1', 'Ok. Rights are set for ' + deviceList[id].title);
        }
        return {ok: checkOk};
    }
    async checkContentList(data) {return await this.generic.checkContentList(data).catch((error) => {logger.log('checkContentList', 'ERROR', 'ERROR: generic.checkContentList failed'); return {ok: false};})};
	async checkContentNb(data) {return await this.generic.checkContentNb(data).catch((error) => {logger.log('checkContentNb', 'ERROR', 'ERROR: generic.checkContentNb failed'); return {ok: false};})};
	async checkData(data) {return await this.generic.checkData(data).catch((error) => {logger.log('checkData', 'ERROR', 'ERROR: generic.checkData failed'); return {ok: false};})};
    async create(data) {return await this.generic.create(data).catch((error) => {logger.log('create', 'ERROR', 'ERROR: generic.create failed'); return {ok: false};})};
    async createIfNotExist(data) {return await this.generic.createIfNotExist(data).catch((error) => {logger.log('create', 'ERROR', 'ERROR: generic.createIfNotExist failed'); return {ok: false};})};
	async delete(data) {return await this.generic.delete(data).catch((error) => {logger.log('delete', 'ERROR', 'ERROR: generic.delete failed'); return {ok: false};})};
	async deleteContent(data) {return await this.generic.deleteContent(data).catch((error) => {logger.log('deleteContent', 'ERROR', 'ERROR: generic.deleteContent failed'); return {ok: false};})};
	async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); return {ok: false};})};
    async getContent(data) {return await this.generic.getContent(data).catch((error) => {logger.log('getContent', 'ERROR', 'ERROR: generic.getContent failed'); return {ok: false};})};
    async getContentById(data) {return await this.generic.getContentById(data).catch((error) => {logger.log('getContent', 'ERROR', 'ERROR: generic.getContent failed'); return {ok: false};})};
    async getData(data) {return await this.generic.getData(data).catch((error) => {logger.log('getData', 'ERROR', 'ERROR: generic.getData failed'); return {ok: false};})};
    async getDataById(data) {return await this.generic.getDataById(data).catch((error) => {logger.log('getDataById', 'ERROR', 'ERROR: generic.getDataById failed'); return {ok: false};})};
	async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); return {ok: false};})};
    async postContent(data) {return await this.generic.postContent(data).catch((error) => {logger.log('postContent', 'ERROR', 'ERROR: generic.postContent failed'); return {ok: false};})};
    async postContentFromId(data) {return await this.generic.postContentFromId(data).catch((error) => {logger.log('postContentFromId', 'ERROR', 'ERROR: generic.postContentFromId failed'); return {ok: false};})};
    async postSynchro(data) {return await this.generic.postSynchro(data).catch((error) => {logger.log('postSynchro', 'ERROR', 'ERROR: generic.postSynchro failed'); return {ok: false};})};
    async publish(data) {return await this.generic.publish(data).catch((error) => {logger.log('publish', 'ERROR', 'ERROR: generic.publish failed'); return {ok: false};})};
    async publishById(data) {return await this.generic.publishById(data).catch((error) => {logger.log('publish', 'ERROR', 'ERROR: generic.publish failed'); return {ok: false};})};
}
module.exports = Playlist;