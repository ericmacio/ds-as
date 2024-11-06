const { networkInterfaces } = require('os');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'Generic');
/*--------------------------------------------------------------------------------------------
		Generic
---------------------------------------------------------------------------------------------*/
class Generic {
	constructor(apiCore, type, profile, getCreateInfo) {
		var caller = 'Generic';
		this.apiCore = apiCore;
		this.type = type;
		this.profile = profile;
		this.getCreateInfo = getCreateInfo;
	}
	// checkContentList
    async checkContentList(data) {
		var caller = 'checkContent';
		var item = {type: this.type, profile: this.profile, data: data};
		try {
			var result = await this.apiCore.getItemContent(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: apiCore.getItemContent result is ko'); 
				return result;
			}
			logger.log(caller, 'DEBUG', 'getItemContent successful');
			var content = result.data;
			var checkOk = true;
			for(var id=0; id<item.data.contentList.length; id++) {
				var found = false;
				for(var contentId=0; contentId < content.length; contentId++) {
					if(content[contentId].title == item.data.contentList[id]) {
						found = true;
						break;
					}
				}
				if(!found) {
					logger.log(caller, 'ERROR', 'ERROR: content not found: ' + item.data.contentList[id]);
					checkOk = false;
					break;
				}
			}
			return {ok: checkOk};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemContent failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	// checkContentNb
    async checkContentNb(data) {
        var caller = 'checkContent';
		var item = {type: this.type, profile: this.profile, data: data};
		try {
			var result = await this.apiCore.getNbContent(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: apiCore.getNbContent result is ko'); 
				return result;
			}
			var nbContent = result.data;
			var checkOk = true;
			if(nbContent != data.nbContent) {
				logger.log(caller, 'ERROR', 'ERROR: content check failed for ' + this.type + ' ' + data.name + ' and content ' + data.contentName + '. Expected: ' + data.nbContent + ', got: ' + nbContent);
				checkOk = false;
			}
			logger.log(caller, 'DEBUG', 'getNbContent successful');
            return {ok: checkOk};
		}  catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.getNbContent failed');
			return {ok: false};
		}
	}
	// checkData
    async checkData_OLD(data) {
        var caller = 'checkData_OLD';
		var item = {type: this.type, profile: this.profile, data: data};
		try {
			var result = await this.apiCore.getItemData(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: apiCore.getItemData result is ko'); 
				return result;
			}
			var data = result.data;
			logger.log(caller, 'DEBUG', 'getItemData successful');
			var checkOk = true;
			var error;
			for(var key in item.data.check) {
				if(typeof(data[key]) == 'undefined') {
					logger.log(caller, 'ERROR', 'ERROR: key ' + key + ' not found in server data: '+ JSON.stringify(data));
					checkOk = false;
					error = 'Key missing: ' + key;
				} else if(data[key] != item.data.check[key]) {
					logger.log(caller, 'ERROR', 'ERROR: key ' + key + ' value does not match. Expected: ' + item.data.check[key] + ', got: ' + data[key]);
					checkOk = false;
					error = 'Check failed';
				} else
					logger.log(caller, 'INFO2', 'Check key ' + key + ' ok' + ', value: ' + data[key]);
			}
            return {ok: checkOk, error: error};
		}  catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemData failed');
			return {ok: false};
		}
	}
	async checkData(data) {
		var caller = 'checkData';
		var item = {type: this.type, profile: this.profile, data: data};
        var timeOutSec = (data.timeOut) ? data.timeOut : 30;
        const waitTimeSec = 5;
        var durationSec = 0;
        this.checkItemData = async () => {
            //Get device data
            try {
                let result = await this.apiCore.getItemData(item);
				if(!result.ok) {
					logger.log(caller, 'INFO2', 'ERROR: apiCore.getItemData result is ko'); 
					return result;
				}
                var serverData = result.data;
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: getItemData failed');
                logger.error(caller, error);
                return {ok: false};
            }
            var checkOk = true;
            //Check all criteria are met
            for(var key in data.check) {
				if(typeof(serverData[key]) == 'undefined') {
					logger.log(caller, 'ERROR', 'ERROR: key ' + key + ' not found in server data: '+ JSON.stringify(serverData));
					return({ok: false});
				} else if(data.check[key] != serverData[key]) {
                    //One criteria is not met. Let's stop
                    if(durationSec >= timeOutSec) {
                        logger.log(caller, 'ERROR', 'ERROR: check failed for ' + key + '. Expected: ' + data.check[key] + ', got: ' + serverData[key]);
                        logger.log(caller, 'INFO2', 'ERROR: Server data: ' + JSON.stringify(serverData));
					} else
						logger.log(caller, 'WARNING', 'WARNING: check failed for ' + key + '. Expected: ' + data.check[key] + ', got: ' + serverData[key]);
                    checkOk = false;
                    break;
                }
            }
            if(!checkOk && (durationSec < timeOutSec)) {
                durationSec += waitTimeSec;
                logger.log(caller, 'WARNING', 'WARNING: Retry in ' + waitTimeSec + ' seconds ...');
                return new Promise(resolve => setTimeout(() => {return resolve(this.checkItemData());}, waitTimeSec * 1000));
            } else
                return {ok: checkOk, data: serverData};
        }
        //Check item data
        try {
			let result = await this.checkItemData();
			if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: checkItemData result is ko');
                logger.log(caller, 'ERROR', 'ERROR: Data check failed for device ' + data.name);
			}
            return result;
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: checkItemData failed');
            logger.error(caller, error);
			return {ok: false};
		}
    }
	// create
    async create(data) {
		var caller = 'create';
		var item = {type: this.type, profile: this.profile, data: data};
		if(!this.getCreateInfo) {
			logger.log(caller, 'ERROR', 'ERROR: getCreateInfo undefined');
			throw new Error('getCreateInfo does not exist for type: ' + this.type);
		}
		//Get createInfo of element to create
		try {
			var result = await this.getCreateInfo(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getCreateInfo result is ko'); 
				return result;
			}
			var createInfo = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getCreateInfo failed');
			return {ok: false};
		}
		//Create element
		item.data.createData = createInfo.createData;
		item.urlPath = createInfo.urlPath;
		try {
			var result = await this.apiCore.createItem(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: apiCore.createItem result is ko'); 
				return result;
			}
			return {ok: true, data: result.data};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.createItem failed');
			return {ok: false};
		}
	}
	// createIfNotExist
    async createIfNotExist(data) {
		var caller = 'createIfNotExist';
		//Check if already exist
		try {
			var result = await this.exist(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: exist result is ko'); 
				return result;
			}
			var exist = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: exist failed');
			return {ok: false};
		}
		//Create it if not exist
		if(!exist) {
			try {
				var result = await this.create(data);
				if(!result.ok)
					logger.log(caller, 'INFO2', 'ERROR: create result is ko');
				else
					logger.log(caller, 'INFO0', ' Item has been created: ' + data.name);
				return result;
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: create failed');
				return {ok: false};
			}
		} else {
			logger.log(caller, 'INFO1', this.type + ' already exists: ' + data.name + '. Do not create it');
			return {ok: true};
		}
	}
	// delete
    async delete(data) {
		var caller = 'del';
		var item = {type: this.type, profile: this.profile, data: data};
		try {
			var result = await this.apiCore.deleteItem(item);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.deleteItem result is ko'); 
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.deleteItem failed');
			return {ok: false};
		}
	}
	// deleteFromId
    async deleteFromId(data) {
        var caller = 'deleteFromId';
		var item = {type: this.type, profile: this.profile, data: data};
		try {
			var result = await this.apiCore.deleteItemFromId(item);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.deleteItemFromId result is ko');
			else
				logger.log(caller, 'DEBUG', 'deleteItem successful');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.deleteItemFromId failed');
			return {ok: false};
		}
	}
	// deleteContent
    async deleteContent(data) {
        var caller = 'deleteContent';
		var item = {type: this.type, profile: this.profile, data: data};
		try {
			var result = await this.apiCore.deleteContentFromItem(item);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.deleteContentFromItem result is ko');
			else
				logger.log(caller, 'DEBUG', 'deleteContentFromItem successful');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.deleteContentFromItem failed');
			return {ok: false};
		}
	}
	// exists
    async exist(data) {
        var caller = 'exist';
		var item = {type: this.type, profile: this.profile, data: data};
		try {
			var result = await this.apiCore.itemExist(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: apiCore.itemExist result is ko');
				return {ok: false};
			}
			var exist = result.data;
			if(exist)
				logger.log(caller, 'INFO2', 'Item exists: ' + data.name);
			else
				logger.log(caller, 'INFO2', 'Item does not exist: ' + data.name);
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.itemExist failed');
			return {ok: false};
		}
	}
	// get
    async get(data) {
        var caller = 'get';
		var item = {type: this.type, profile: this.profile, data: data};
		try {
			var result = await this.apiCore.getItemByName(item);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.getItemByName result is ko');
			else
				logger.log(caller, 'DEBUG', 'getItemByName successful');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemByName failed');
			return {ok: false};
		}
	}
	// getContent
    async getContent(data) {
		var caller = 'getContent';
		var item = {type: this.type, profile: this.profile, data: data};
		if(!item.profile) {
			logger.log(caller, 'ERROR', 'ERROR: profile undefined for type: ' + item.type);
			throw new Error('No profile for type: ' + item.type);
		}
		try {
			var result = await this.apiCore.getItemContent(item);
			if(!result.ok)
				logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemContent result is ko');
			else
				logger.log(caller, 'DEBUG', 'getItemContent successful');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemContent failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	// getContentById
    async getContentById(data) {
		var caller = 'getContentById';
		var item = {type: this.type, profile: this.profile, data: data};
		if(!item.profile) {
			logger.log(caller, 'ERROR', 'ERROR: profile undefined for type: ' + item.type);
			throw new Error('No profile for type: ' + item.type);
		}
		try {
			var result = await this.apiCore.getItemContentById(item);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.getItemContentById result is ko');
			else
				logger.log(caller, 'DEBUG', 'apiCore.getItemContentById successful');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemContentById failed');
			return {ok: false};
		}
	}
	// getData
    async getData(data) {
		var caller = 'getData';
		var item = {type: this.type, profile: this.profile, data: data};
		if(!item.profile) logger.log(caller, 'ERROR', 'ERROR: profile undefined for type: ' + item.type);
		logger.log(caller, 'DEBUG', 'item: ' + JSON.stringify(item));
		try {
			var result = await this.apiCore.getItemData(item);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.getItemData result is ko');
			else
				logger.log(caller, 'DEBUG', 'getItemData successful');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemData failed');
			return {ok: false};
		}
	}
	// getDataById
    async getDataById(data) {
		var caller = 'getDataById';
		var item = {type: this.type, profile: this.profile, data: data};
		if(!item.profile) logger.log(caller, 'ERROR', 'ERROR: profile undefined for type: ' + item.type);
		logger.log(caller, 'DEBUG', 'item: ' + JSON.stringify(item));
		try {
			var result = await this.apiCore.getItemDataById(item);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.getItemData result is ko');
			else
				logger.log(caller, 'DEBUG', 'getItemData successful');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemData failed');
			return {ok: false};
		}
	}
	// getId
    async getId(data) {
        var caller = 'getId';
		var item = {type: this.type, profile: this.profile, data: data};
		try {
			var result = await this.apiCore.getItemByName(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: apiCore.getItemByName result is ko');
				return result;
			}
			logger.log(caller, 'DEBUG', 'getItemByName successful');
			return({ok: true, data: result.data.id});
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemByName failed');
			return {ok: false};
		}
	}
	// getProfile
    getProfile() {
        return this.profile;
	}
	// list
    async list(data) {
		var caller = 'list';
		var item = {type: this.type, profile: this.profile, data: data};
		try {
			var result = await this.apiCore.listItem(item);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.listItem result is ko'); 
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.listItem failed');
			return {ok: false};
		}
	}
	// postContent
    async postContent(data) {
		var caller = 'postContent';
		//Get json file
		try {
			var contentProfile = require('./' + data.contentType + '.json');
		} catch {
			logger.log(caller, 'ERROR', 'ERROR: Cannot get profile for content type ' + data.contentType);
			throw new Error('Error when reading .json profile for type: ' + data.contentType);
		}
		//Post content into element
		var item = {type: this.type, profile: this.profile, contentProfile: contentProfile, data: data};
		try {
			var result = await this.apiCore.postContentToItem(item);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.postContentToItem result is ko');
			else
				logger.log(caller, 'DEBUG', 'postContentToItem successful');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.postContentToItem failed');
			return {ok: false};
		}
	}
	// postContentFromId
    async postContentFromId(data) {
		var caller = 'postContentFromId';
		//Get json file
		try {
			var contentProfile = require('./' + data.contentType + '.json');
		} catch {
			logger.log(caller, 'ERROR', 'ERROR: Cannot get profile for content type ' + data.contentType);
			throw new Error('Error when reading .json profile for type: ' + data.contentType);
		}
		//Post content into element
		var item = {type: this.type, profile: this.profile, contentProfile: contentProfile, data: data};
		try {
			var result = await this.apiCore.postContentToItemFromId(item);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.postContentToItem result is ko');
			else
				logger.log(caller, 'DEBUG', 'postContentToItem successful');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.postContentToItem failed');
			return {ok: false};
		}
	}
	// postSynchro
    async postSynchro(data) {
		var caller = 'postSynchro';
		this.getFirstNet = () => {
			const caller = 'getFirstNet';
			const nets = networkInterfaces();
			logger.log(caller, 'DEBUG', 'nets: ' + JSON.stringify(nets));
			const filteredNets = [];
			for (const key in nets) {
				// skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
				const netInfos = nets[key].filter(net => net.address != null && net.family == 'IPv4' && !net.internal);
				if(netInfos.length > 0)
					filteredNets.push(netInfos.map(netInfo => ({...netInfo, name: key})));
			}
			logger.log(caller, 'DEBUG', 'filteredNets: ' + JSON.stringify(filteredNets));
			//Return only first element of first key
			return filteredNets[0][0];
		}
		const host = data.ip;
		const port = data.port;
		//Get json file
		try {
			var webProfile = require('./web.json');
		} catch {
			logger.log(caller, 'ERROR', 'ERROR: Cannot get profile for web type');
			throw new Error('Error when reading .json profile for type web');
		}
		//First create web synchro media
		const synchroName = 'web_synchro_' + data.id;
		const url = 'http://' + host + ':' + port + '/synchro/' + data.id;
		const synchroItem = {
			type: 'web',
			profile: webProfile,
			data: {
				createData: {...webProfile.createData, title: synchroName, url: url}
			},
			urlPath: null
		};
		try {
			let result = await this.apiCore.createItem(synchroItem);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: apiCore.createItem result is ko');
				return result;
			}
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.createItem failed');
			return {ok: false};
		}
		//Now post synchro media into element
		const postData = {name: data.name, contentType: 'web', contentName: synchroName};
		try {
			var result = await this.postContent(postData);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: postContent result is ko');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: postContent failed');
			return {ok: false};
		}
	}
	// publish
    async publish(data) {
        var caller = 'publish';
		var item = {type: this.type, profile: this.profile, data: data};
		try {
			var result = await this.apiCore.publishItem(item);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.publishItem result is ko');
			else
				logger.log(caller, 'DEBUG', 'publishItem successful');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.publishItem failed');
			return {ok: false};
		}
	}
	// publish
    async publishById(data) {
        var caller = 'publish';
		var item = {type: this.type, profile: this.profile, data: data};
		try {
			var result = await this.apiCore.publishItemById(item);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.publishItemById result is ko');
			else
				logger.log(caller, 'DEBUG', 'publishItemById successful');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.publishItemById failed');
			return {ok: false};
		}
	}
}
module.exports = Generic;