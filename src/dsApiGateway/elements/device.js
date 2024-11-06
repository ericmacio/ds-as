const Generic = require('./Generic.js');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'device');
var TYPE = 'device';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get profile. " + error);
	process.exit();
}
/*--------------------------------------------------------------------------------------------
		Device
---------------------------------------------------------------------------------------------*/
class Device {
	constructor(apiCore) {
        this.apiCore = apiCore;
		this.type = TYPE;
        this.profile = PROFILE;
        this.generic = new Generic(this.apiCore, this.type, this.profile, null);
	}
	async checkRights(data) {
        var caller = 'checkRights';
        //Get data type profile from config file
        try {
            var itemProfile = require('./' + data.type + '.json');
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: Cannot get variable profile');
            return callback(error);
        }
        //Get information about playlists
        var item = {type: data.type, profile: itemProfile};
        try {
			var result = await this.apiCore.getItemListByNameList(item, data.list);
			if(!result.ok) {
				logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemListByNameList result is ko');
				return result;
			}
			var itemList = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemListByNameList failed');
			return {ok: false};
        }
        //Get device data
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
        switch(data.type) {
            case 'playlist':
                var rights_name = 'rights_playlists';
                break;
            case 'variable':
                var rights_name = 'rights_variables';
                break;
            case 'feed':
                var rights_name = 'rights_data_feed';
                break;
            default:
                logger.log(caller, 'ERROR', 'ERROR: Unsupported type: ' + data.type);
                throw new Error('Bad type: ' + data.type);
        }
        //Check data now
        var checkOk = true;
        for(var itemId=0; itemId<itemList.length; itemId++) {
            var found = false;
            for(var id=0; id<dsServerData[rights_name].length; id++) {
                if(itemList[itemId].id == dsServerData[rights_name][id].id) {
                    found = true;
                    break;
                }
            }
            if(!found) {
                if (data.value == 'set') {
                    logger.log(caller, 'ERROR', 'ERROR: rights not set for ' + itemList[itemId].title);
                    checkOk = false;
                    break;
                } else
                    logger.log(caller, 'INFO1', 'Ok. Rights are not set for ' + itemList[itemId].title);
            } else if(data.value == 'unset') {
                logger.log(caller, 'ERROR', 'ERROR: rights set for ' + itemList[itemId].title);
                checkOk = false;
                break;
            } else
                logger.log(caller, 'INFO1', 'Ok. Rights are set for ' + itemList[itemId].title);
        }
        return {ok: checkOk};
    }
    async setRights(data) {
        var caller = 'setRights';
        //Get data type profile from config file
        try {
            var itemProfile = require('./' + data.type + '.json');
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: Cannot get variable profile');
            return callback(error);
        }
        //Get information about playlists
        var item = {type: data.type, profile: itemProfile};
        try {
			var result = await this.apiCore.getItemListByNameList(item, data.list);
			if(!result.ok) {
				logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemListByNameList result is ko');
				return result;
			}
			var itemList = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemListByNameList failed');
			return {ok: false};
        }
        //Get device data
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
        var deviceId = dsServerData.id;
        var urlPath = '/' + deviceId;
        var headers = {};
        //FROM V5.7.2
        if(this.apiCore.version.includes('5.7.2') || this.apiCore.version.includes('5.7.3')) {
            var sentData = {
                rights_playlists: dsServerData.rights_elements,
                rights_variables: dsServerData.rights_variables
            }
            switch(data.type) {
                case 'playlist':
                case 'feed':
                    var rights_name = 'rights_playlists';
                    break;
                case 'variable':
                    var rights_name = 'rights_variables';
                    break;
                default:
                    logger.log(caller, 'ERROR', 'ERROR: Unsupported type: ' + data.type);
                    throw new Error('Bad type: ' + data.type);
            }
        } else {
            //BEFORE V5.7.2
            var sentData = {
                rights_devices_groups: dsServerData.rights_devices_groups,
                rights_playlists: dsServerData.rights_playlists,
                rights_data_feed: dsServerData.rights_data_feed,
                rights_external_feed: dsServerData.rights_external_feed,
                rights_feed: dsServerData.rights_feed,
                rights_variables: dsServerData.rights_variables
            }
            switch(data.type) {
                case 'playlist':
                    var rights_name = 'rights_playlists';
                    break;
                case 'variable':
                    var rights_name = 'rights_variables';
                    break;
                case 'feed':
                    var rights_name = 'rights_data_feed';
                    break;
                default:
                    logger.log(caller, 'ERROR', 'ERROR: Unsupported type: ' + data.type);
                    throw new Error('Bad type: ' + data.type);
            }
        }
        for(var itemId=0; itemId<itemList.length; itemId++) {
            var found = false;
            for(var id=0; id<sentData[rights_name].length; id++) {
                if(itemList[itemId].id == sentData[rights_name][id].id) {
                    found = true;
                    break;
                }
            }
            if(!found) {
                logger.log(caller, 'INFO1', 'Item ' + data.type + ' not found: ' + itemList[itemId].title);
                if(data.value == 'unset') {
                    logger.log(caller, 'WARNING', 'WARNING: rights already not set for ' + itemList[itemId].title);
                } else if(data.value == 'set') {
                    //Add device to the list
                    sentData[rights_name].push({id: itemList[itemId].id, is_group_right: false});
                    logger.log(caller, 'INFO1', 'Rights set for ' + itemList[itemId].title);
                } else
                    logger.log(caller, 'WARNING', 'WARNING: unexpected situation for not found item. Type: ' + data.type + ', value: ' + data.value);
            } else {
                logger.log(caller, 'INFO1', 'Item ' + data.type + ' found: ' + itemList[itemId].title);
                if(data.value == 'unset') {
                    //Remove device from the rights list
                    sentData[rights_name].splice(id, 1);
                    logger.log(caller, 'INFO1', 'Rights unset for ' + itemList[itemId].title);
                } else if(data.value == 'set') {
                    logger.log(caller, 'WARNING', 'WARNING: rights already set for ' + itemList[itemId].title);
                } else
                    logger.log(caller, 'WARNING', 'WARNING: unexpected situation for found item ' + data.type);
            }
        }
        var sentForm;
        //Set rights to the device
        var cmd = this.profile.cmdList[this.profile.cmd.putRights];
        try {
			let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: putRights result is ko');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
			return {ok: false};
		}
    }
    async getContentStatus(data) {
        var caller = 'getContentStatus';
        //Get device id
        try {
			let result = await this.getId(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getId result is ko');
				return result;
			}
			var deviceId = result.data;
			logger.log(caller, 'DEBUG', 'Device id: ' + deviceId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getId failed');
			return {ok: false};
		}
        var urlPath = '/' + deviceId, headers = {}, sentData, sentForm;
        var cmd = this.profile.cmdList[this.profile.cmd.getContentStatus];
        try {
			let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: getContentStatus result is ko');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
			return {ok: false};
		}
    }
    async checkContentStatus(data) {
        var caller = 'checkContentStatus';
        var timeOutSec = (data.timeOut) ? data.timeOut : 900;
        const waitTimeSec = 15;
        var durationSec = 0;
        this.checkContent = async () => {
            try {
                let result = await this.getContentStatus(data);
                if(!result.ok) {
                    logger.log(caller, 'INFO2', 'ERROR: getContentStatus result is ko');
                    return result;
                }
                var serverData = result.data;
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: getContentStatus failed');
                logger.error(caller, error);
                return {ok: false};
            }
            var contentP = serverData.broadcastedContentP;
            var contentF = serverData.broadcastedContentF;
            logger.log(caller, 'DEBUG', 'Length : ' + contentP.length);
            var checkOk = true;
            //Check broadcasted channel
            if(data.check.channel) {
                for(var key in data.check.channel) {
                    if(key == 'version') {
                        let version = (serverData.broadcastedChannel['current_version'] == serverData.broadcastedChannel['folder_version']);
                        if((version && (data.check.channel[key] != 'ok')) || (!version && (data.check.channel[key] == 'ok'))) {
                            if(durationSec >= timeOutSec)
                                logger.log(caller, 'ERROR', 'ERROR: Channel contentStatus check failed for version number. current version: ' + serverData.broadcastedChannel['current_version'] + ', folder version: ' + serverData.broadcastedChannel['folder_version']);
                            else
                                logger.log(caller, 'WARNING', 'WARNING: Channel contentStatus check failed for version number. current version: ' + serverData.broadcastedChannel['current_version'] + ', folder version: ' + serverData.broadcastedChannel['folder_version']);
                            checkOk = false;
                        }
                    } else {
                        if(data.check.channel[key] != serverData.broadcastedChannel[key]) {
                            if(durationSec >= timeOutSec)
                                logger.log(caller, 'ERROR', 'ERROR: Channel contentStatus check failed for key: ' + key + ', expected: ' + data.check.channel[key] + ', got: ' + serverData.broadcastedChannel[key]);
                            else
                                logger.log(caller, 'WARNING', 'WARNING: Channel contentStatus check failed for key: ' + key + ', expected: ' + data.check.channel[key] + ', got: ' + serverData.broadcastedChannel[key]);
                            checkOk = false;
                        }
                    }
                }
            }
            //Check broadcasted playlist
            if(data.check.playlist) {
                for(let id=0; id<data.check.playlist.length; id++) {
                    ///Look for the playlist name from content
                    let playlist = data.check.playlist[id];
                    const foundPlaylist = contentP.filter((content) => content.display_name == playlist.display_name)[0];
                    if(!foundPlaylist) {
                        if(durationSec >= timeOutSec)
                            logger.log(caller, 'ERROR', 'ERROR: Playlist not found: ' + playlist.display_name);
                        else
                            logger.log(caller, 'WARNING', 'WARNING: Playlist not found: ' + playlist.display_name);
                        checkOk = false;
                    } else {
                        for(var key in playlist) {
                            if(key == 'version') {
                                let version = (foundPlaylist['current_version'] == foundPlaylist['folder_version']);
                                if((version && (playlist[key] != 'ok')) || (!version && (playlist[key] == 'ok'))) {
                                    if(durationSec >= timeOutSec)
                                        logger.log(caller, 'ERROR', 'ERROR: Playlist ' + playlist.display_name + ' contentStatus check failed for version number. Current version: ' + foundPlaylist['current_version'] + ', folder version: ' + foundPlaylist['folder_version']);
                                    else
                                        logger.log(caller, 'WARNING', 'WARNING: Playlist ' + playlist.display_name + ' contentStatus check failed for version number. Current version: ' + foundPlaylist['current_version'] + ', folder version: ' + foundPlaylist['folder_version']);
                                    checkOk = false;
                                }
                            } else {
                                if(playlist[key] != foundPlaylist[key]) {
                                    if(durationSec >= timeOutSec)
                                        logger.log(caller, 'ERROR', 'ERROR: Playlist ' + playlist.display_name + ' contentStatus check failed for key: ' + key + ', expected: ' + playlist[key] + ', got: ' + foundPlaylist[key]);
                                    else
                                        logger.log(caller, 'WARNING', 'WARNING: Playlist ' + playlist.display_name + ' contentStatus check failed for key: ' + key + ', expected: ' + playlist[key] + ', got: ' + foundPlaylist[key]);
                                    checkOk = false;
                                }
                            }
                        }
                    }
                }
            }
            //Check broadcasted feeds
            if(data.check.feed) {
                for(let id=0; id<data.check.feed.length; id++) {
                    ///Look for the playlist name from content
                    let playlist = data.check.feed[id];
                    const foundFeed = contentF.filter((content) => content.display_name == playlist.display_name)[0];
                    if(!foundFeed) {
                        if(durationSec >= timeOutSec)
                            logger.log(caller, 'ERROR', 'ERROR: Feed not found: ' + playlist.display_name);
                        else
                            logger.log(caller, 'WARNING', 'WARNING: Feed not found: ' + playlist.display_name);
                        checkOk = false;
                    } else {
                        for(var key in playlist) {
                            if(key == 'version') {
                                let version = (foundFeed['current_version'] == foundFeed['folder_version']);
                                if((version && (playlist[key] != 'ok')) || (!version && (playlist[key] == 'ok'))) {
                                    if(durationSec >= timeOutSec)
                                        logger.log(caller, 'ERROR', 'ERROR: Feed ' + playlist.display_name + ' contentStatus check failed for version number. Current version: ' + foundFeed['current_version'] + ', folder version: ' + foundFeed['folder_version']);
                                    else
                                        logger.log(caller, 'WARNING', 'WARNING: Feed ' + playlist.display_name + ' contentStatus check failed for version number. Current version: ' + foundFeed['current_version'] + ', folder version: ' + foundFeed['folder_version']);
                                    checkOk = false;
                                }
                            } else {
                                if(playlist[key] != foundFeed[key]) {
                                    if(durationSec >= timeOutSec)
                                        logger.log(caller, 'ERROR', 'ERROR: Feed ' + playlist.display_name + ' contentStatus check failed for key: ' + key + ', expected: ' + playlist[key] + ', got: ' + foundFeed[key]);
                                    else
                                        logger.log(caller, 'WARNING', 'WARNING: Feed ' + playlist.display_name + ' contentStatus check failed for key: ' + key + ', expected: ' + playlist[key] + ', got: ' + foundFeed[key]);
                                    checkOk = false;
                                }
                            }
                        }
                    }
                }
            }
            //Check authorized variables
            if(data.check.variableList) {
                logger.log(caller, 'INFO2', 'Checking variable list');
                for(let id=0; id<serverData.authorizedVar.length; id++) {
                    logger.log(caller, 'INFO2', 'Checking ' + serverData.authorizedVar[id].display_name);
                    if(!data.check.variableList.includes(serverData.authorizedVar[id].display_name)) {
                        if(durationSec >= timeOutSec)
                            logger.log(caller, 'ERROR', 'ERROR: Variable ' + serverData.authorizedVar[id].display_name + ' is not included in list');
                        else
                            logger.log(caller, 'WARNING', 'WARNING: Variable ' + serverData.authorizedVar[id].display_name + ' is not included in list');
                        checkOk = false;
                    }
                }
                for(let id1=0; id1<data.check.variableList.length; id1++) {
                    var found = false;
                    logger.log(caller, 'INFO2', 'Checking ' + data.check.variableList[id1]);
                    for(let id2=0; id2<serverData.authorizedVar.length; id2++) {
                        if(data.check.variableList[id1] == serverData.authorizedVar[id2].display_name) {
                            found = true;
                            break;
                        }
                    }
                    if(!found) {
                        if(durationSec >= timeOutSec)
                            logger.log(caller, 'ERROR', 'ERROR: Variable ' + data.check.variableList[id1] + ' is not included in content status');
                        else
                            logger.log(caller, 'WARNING', 'WARNING: Variable ' + data.check.variableList[id1] + ' is not included in content status');
                        checkOk = false;
                    }
                }
            }
            //Check broadcasted playlist
            if(data.check.playlistList) {
                logger.log(caller, 'INFO2', 'Checking playlist list');
                for(let id=0; id<contentP.length; id++) {
                    logger.log(caller, 'INFO2', 'Checking ' + contentP[id].display_name);
                    if(!data.check.playlistList.includes(contentP[id].display_name)) {
                        if(durationSec >= timeOutSec)
                            logger.log(caller, 'ERROR', 'ERROR: Playlist ' + contentP[id].display_name + ' is not included in list');
                        else
                            logger.log(caller, 'WARNING', 'WARNING: Playlist ' + contentP[id].display_name + ' is not included in list');
                        checkOk = false;
                    }
                }
                for(let id1=0; id1<data.check.playlistList.length; id1++) {
                    var found = false;
                    logger.log(caller, 'INFO2', 'Checking ' + data.check.playlistList[id1]);
                    for(let id2=0; id2<contentP.length; id2++) {
                        if(data.check.playlistList[id1] == contentP[id2].display_name) {
                            found = true;
                            break;
                        }
                    }
                    if(!found) {
                        if(durationSec >= timeOutSec)
                            logger.log(caller, 'ERROR', 'ERROR: Playlist ' + data.check.playlistList[id1] + ' is not included in content status');
                        else
                            logger.log(caller, 'WARNING', 'WARNING: Playlist ' + data.check.playlistList[id1] + ' is not included in content status');
                        checkOk = false;
                    }
                }
            }
            //Check broadcasted feeds
            if(data.check.feedList) {
                logger.log(caller, 'INFO2', 'Checking playlist list');
                for(let id=0; id<contentF.length; id++) {
                    logger.log(caller, 'INFO2', 'Checking ' + contentF[id].display_name);
                    if(!data.check.feedList.includes(contentF[id].display_name)) {
                        if(durationSec >= timeOutSec)
                            logger.log(caller, 'ERROR', 'ERROR: Feed ' + contentF[id].display_name + ' is not included in list');
                        else
                            logger.log(caller, 'WARNING', 'WARNING: Feed ' + contentF[id].display_name + ' is not included in list');
                        checkOk = false;
                    }
                }
                for(let id1=0; id1<data.check.feedList.length; id1++) {
                    var found = false;
                    logger.log(caller, 'INFO2', 'Checking ' + data.check.feedList[id1]);
                    for(let id2=0; id2<contentF.length; id2++) {
                        if(data.check.feedList[id1] == contentF[id2].display_name) {
                            found = true;
                            break;
                        }
                    }
                    if(!found) {
                        if(durationSec >= timeOutSec)
                            logger.log(caller, 'ERROR', 'ERROR: Feed ' + data.check.feedList[id1] + ' is not included in content status');
                        else
                            logger.log(caller, 'WARNING', 'WARNING: Feed ' + data.check.feedList[id1] + ' is not included in content status');
                        checkOk = false;
                    }
                }
            }
            //Check contentError
            if(typeof(data.check.contentError) != 'undefined') {
                if(serverData.contentError.length != data.check.contentError) {
                    if(durationSec >= timeOutSec)
                        logger.log(caller, 'ERROR', 'ERROR: contentStatus check failed for contentError, expected: ' + data.check.contentError + ', got: ' + serverData.contentError.length);
                    else
                        logger.log(caller, 'WARNING', 'WARNING: contentStatus check failed for contentError, expected: ' + data.check.contentError + ', got: ' + serverData.contentError.length);
                    checkOk = false;
                }
            }
            //Check mediaError
            if(typeof(data.check.mediaError) != 'undefined') {
                if(serverData.mediaError.length != data.check.mediaError) {
                    if(durationSec >= timeOutSec)
                        logger.log(caller, 'ERROR', 'ERROR: contentStatus check failed for mediaError, expected: ' + data.check.mediaError + ', got: ' + serverData.mediaError.length);
                    else
                        logger.log(caller, 'WARNING', 'WARNING: contentStatus check failed for mediaError, expected: ' + data.check.mediaError + ', got: ' + serverData.mediaError.length);
                    checkOk = false;
                }
            }
            //Check last loop duration
            if(data.check.last_loop_duration_s) {
                var GAP_PERCENT = 0.03;
                var max = data.check.last_loop_duration_s * (1 + GAP_PERCENT);
                var min = data.check.last_loop_duration_s * (1 - GAP_PERCENT);
                if((serverData.last_loop_duration_s > max) || (serverData.last_loop_duration_s < min)) {
                    if(durationSec >= timeOutSec)
                        logger.log(caller, 'ERROR', 'ERROR: contentStatus check failed for last_loop_duration_s, expected: ' + data.check.last_loop_duration_s + ', got: ' + serverData.last_loop_duration_s);
                    else
                        logger.log(caller, 'WARNING', 'WARNING: contentStatus check failed for last_loop_duration_s, expected: ' + data.check.last_loop_duration_s + ', got: ' + serverData.last_loop_duration_s);
                    checkOk = false;
                } else
                    logger.log(caller, 'INFO1', 'last_loop_duration_s : ' + serverData.last_loop_duration_s);
            }
            if(!checkOk && (durationSec < timeOutSec)) {
                durationSec += waitTimeSec;
                logger.log(caller, 'WARNING', 'WARNING: Retry in ' + waitTimeSec + ' seconds ...');
                return new Promise(resolve => setTimeout(() => {return resolve(this.checkContent());}, waitTimeSec * 1000));
            } else
                return {ok: checkOk, data: serverData};
        }
        //Check device content
        try {
			let result = await this.checkContent();
			if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: checkContent result is ko');
                logger.log(caller, 'ERROR', 'ERROR: Content status check failed for device ' + data.name);
			}
            return result;
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: checkContent failed');
            logger.error(caller, error);
			return {ok: false};
		}
    }
    async setConfig(data) {
        var caller = 'setConfig';
        //Get device id
		try {
			let result = await this.getId(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getId result is ko');
				return result;
			}
			var deviceId = result.data;
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: getId failed');
            logger.error(caller, error);
			return {ok: false};
        }
        //Set device config
        var urlPath = '/' + deviceId, headers = {}, sentForm;
        var sentData = new Object();
        sentData.configuration = new Object();
        for(var key in data.config) {
            logger.log(caller, 'INFO0', 'Set ' + key + ' value to '+ data.config[key]);
            sentData.configuration[key] =  data.config[key];
        }
        sentData.id = deviceId;
        var cmd = this.profile.cmdList[this.profile.cmd.putConfig];
        try {
			let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: putConfig result is ko');
			return result;
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
            logger.error(caller, error);
			return {ok: false};
		}
    }
    async checkConfig(data) {
        var caller = 'checkConfig';
        var timeOutSec = (data.timeOut) ? data.timeOut : 30;
        const waitTimeSec = 5;
        var durationSec = 0;
        this.checkConfigData = async () => {
            //Get device data
            try {
                let result = await this.getData(data);
                if(!result.ok) {
                    logger.log(caller, 'INFO2', 'ERROR: getData result is ko');
                    return result;
                }
                var serverData = result.data;
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: getData failed');
                logger.error(caller, error);
                return {ok: false};
            }
            var checkOk = true;
            //Check all criteria are met
            for(var key in data.check) {
                if(data.check[key] != serverData[key]) {
                    //One criteria is not met. Let's stop
                    if(durationSec >= timeOutSec) {
                        logger.log(caller, 'ERROR', 'ERROR: Check failed for ' + key + '. Expected: ' + data.check[key] + ', got: ' + serverData[key]);
                        logger.log(caller, 'INFO2', 'ERROR: Server data: ' + JSON.stringify(serverData));
                    }
                    checkOk = false;
                    break;
                }
            }
            if(!checkOk && (durationSec < timeOutSec)) {
                durationSec += waitTimeSec;
                logger.log(caller, 'WARNING', 'WARNING: Check failed. Retry in ' + waitTimeSec + ' seconds ...');
                return new Promise(resolve => setTimeout(() => {return resolve(this.checkConfigData());}, waitTimeSec * 1000));
            } else
                return {ok: checkOk, data: serverData};
        }
        //Check device content
        try {
			let result = await this.checkConfigData();
			if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: checkConfigData result is ko');
                logger.log(caller, 'ERROR', 'ERROR: Config check failed for device ' + data.name);
			}
            return result;
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: checkConfigData failed');
            logger.error(caller, error);
			return {ok: false};
		}
    }
    async requestLogs(data) {
        var caller = 'requestLogs';
        //Get device id
		try {
			let result = await this.getId(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getId result is ko');
				return result;
			}
			var deviceId = result.data;
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: getId failed');
            logger.error(caller, error);
			return {ok: false};
        }
        //Set device config
        var urlPath = '/' + deviceId, headers = {}, sentForm, sentData;
        var cmd = this.profile.cmdList[this.profile.cmd.requestLogs];
        try {
			let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: requestLogs result is ko');
			return result;
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
            logger.error(caller, error);
			return {ok: false};
		}
    }
    async getLogs(data) {
        var caller = 'getLogs';
        //Get device id
		try {
			let result = await this.getId(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getId result is ko');
				return result;
			}
			var deviceId = result.data;
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: getId failed');
            logger.error(caller, error);
			return {ok: false};
        }
        //Set device config
        var urlPath = '/' + deviceId, headers = {}, sentForm, sentData;
        var cmd = this.profile.cmdList[this.profile.cmd.getLogs];
        try {
			let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: getLogs result is ko');
			return result;
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
            logger.error(caller, error);
			return {ok: false};
		}
    }
    async checkLogs(data) {
        var caller = 'checkLogs';
        var timeOutSec = (data.timeOut) ? data.timeOut : 180;
        const waitTimeSec = 15;
        var durationSec = 0;
        const maxDiffDateMsec = 120 * 1000;
        this.checkLogsData = async () => {
            //Get logs data
            try {
                let result = await this.getLogs(data);
                if(!result.ok) {
                    logger.log(caller, 'INFO2', 'ERROR: getLogs result is ko');
                    return result;
                }
                var serverData = result.data;
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: getLogs failed');
                logger.error(caller, error);
                return {ok: false};
            }
            var checkOk = true;
            //First check log state
            if(serverData.state != 'done') {
                //State criteria is not met
                if(durationSec >= timeOutSec) {
                    logger.log(caller, 'ERROR', 'ERROR: Check failed for logs state. Expected: done , got: ' + serverData.state);
                    logger.log(caller, 'INFO2', 'ERROR: Server data: ' + JSON.stringify(serverData));
                } else
                    logger.log(caller, 'WARNING', 'WARNING: Check failed for logs state. Expected: done , got: ' + serverData.state);
                checkOk = false;
            } else {
                logger.log(caller, 'INFO0', 'Logs state ok: ' + serverData.state);
                //Check log url
                if(serverData.url == '') {
                    //URL criteria is not met
                    if(durationSec >= timeOutSec) {
                        logger.log(caller, 'ERROR', 'ERROR: Check failed for logs url. Got empty value');
                        logger.log(caller, 'INFO2', 'ERROR: Server data: ' + JSON.stringify(serverData));
                    } else
                        logger.log(caller, 'WARNING', 'WARNING: Check failed for logs url. Got empty value');
                    checkOk = false;
                } else {
                    logger.log(caller, 'INFO0', 'Logs URL ok: ' + serverData.url);
                    //Check date
                    var currDate = new Date();
                    var logsDate = new Date(serverData.date);
                    const diffTimeMsec = currDate.getTime() - logsDate.getTime();
                    logger.log(caller, 'INFO0', 'diffTimeMsec: ' + diffTimeMsec);
                    if(diffTimeMsec > maxDiffDateMsec) {
                        //Date criteria is not met
                        if(durationSec >= timeOutSec) {
                            logger.log(caller, 'ERROR', 'ERROR: Check failed for logs date. Got: ' + logsDate.toLocaleString());
                            logger.log(caller, 'INFO2', 'ERROR: Server data: ' + JSON.stringify(serverData));
                        } else
                            logger.log(caller, 'WARNING', 'WARNING: Check failed for logs date. Got: ' + logsDate.toLocaleString());
                        checkOk = false;
                    }
                }
            }
            if(!checkOk && (durationSec < timeOutSec)) {
                durationSec += waitTimeSec;
                logger.log(caller, 'WARNING', 'WARNING: Retry in ' + waitTimeSec + ' seconds ...');
                return new Promise(resolve => setTimeout(() => {return resolve(this.checkLogsData());}, waitTimeSec * 1000));
            } else
                return {ok: checkOk, data: serverData};
        }
        //Check device logs
        try {
			let result = await this.checkLogsData();
			if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: checkConfigData result is ko');
                logger.log(caller, 'ERROR', 'ERROR: Config check failed for device ' + data.name);
			}
            return result;
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: checkConfigData failed');
            logger.error(caller, error);
			return {ok: false};
		}
    }
    async checkData(data) {return await this.generic.checkData(data).catch((error) => {logger.log('checkData', 'ERROR', 'ERROR: generic.checkData failed'); logger.error(caller, error); return {ok: false};})};
    async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); logger.error(caller, error); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); logger.error(caller, error); return {ok: false};})};
	async getData(data) {return await this.generic.getData(data).catch((error) => {logger.log('getData', 'ERROR', 'ERROR: generic.getData failed'); logger.error(caller, error); return {ok: false};})};
	async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); logger.error(caller, error); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); logger.error(caller, error); return {ok: false};})};
}
module.exports = Device;