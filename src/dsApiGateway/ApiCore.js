const fs = require('fs');
const request = require('request');
const formData = require('form-data');
const httpClient = require('../utils/httpClient');
const Logger = require('../logging/logger');
const TmpDir = 'D:/Node.js/ds-as/src/tmp/uploads/';
const logger = new Logger(__filename, 'ApiCore');
const ApiConfig = require('./api.json');
/*--------------------------------------------------------------------------------------------
		ApiCore
---------------------------------------------------------------------------------------------*/
class ApiCore {
	constructor(url, port, user, password) {
		const caller = 'ApiCore';
		this.url = url;
		this.port = port;
		this.user = user;
		this.password = password;
		this.version = '0.0.0.0' //Will be set later. Cannot be set in constructor because of asynchronous request usage
		logger.log(caller, 'DEBUG', 'Create API core. Url: ' + this.url + ', port: ' + this.port);
	}
	//setVersion
	async setVersion() {
		const caller = 'setVersion';
		//We need to get the current API version for handling properly the API
		var urlPath;
		var headers = {};
		var sentData;
		var sentForm;
		try {
			var result = await this.executeCmd('user', ApiConfig.cmdList.getVersion, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
			else {
				this.version = result.data;
				logger.log(caller, 'INFO0', 'API version: ' + this.version);
			}
			return(result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//authenticate
	async authenticate() {
		const caller = 'authenticate';
		//Send authentication request to the server and get back valid token
		logger.log(caller, 'DEBUG', 'apiUrl: ' + this.apiUrl);
		var urlPath;
		var headers = {};
		//var sentData = 'username=' +  this.user + '&password=' + this.password;
		const sentData = {
			username: this.user,
			password: this.password
		}
		var sentForm;
		try {
			var result = await this.executeCmd('user', ApiConfig.cmdList.postAccount, headers, urlPath, sentData, sentForm);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
				return(result);
			}
			var token = result.data.value;
			logger.log(caller, 'INFO2', 'Token: ' + token);
			return {ok: true, data: token};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	async isTokenValid() {
		const caller = 'isTokenValid';
		var urlPath;
		var headers = {};
		var sentData;
		var sentForm;
		try {
			var result = await this.executeCmd('user', ApiConfig.cmdList.getIsTokenValid, headers, urlPath, sentData, sentForm);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
				return(result);
			}
			return {ok: true, data:result.data.value};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//authenticate
	async logout() {
		const caller = 'logout';
		var urlPath;
		var headers = {};
		var sentData;
		var sentForm;
		try {
			var result = await this.executeCmd('user', ApiConfig.cmdList.logOut, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//setCookie
	setCookie(cookie) {
		const caller = 'ApiCore';
		this.cookie = cookie;
		logger.log(caller, 'DEBUG', 'New cookie set: ' + this.cookie);
	}
	//getUser
	getUser() {
		return this.user;
	}
	//executeCmd
	async executeCmd(type, cmd, headers, urlPath, sentData, sentForm) {
		const caller = 'executeCmd';
		logger.log(caller, 'DEBUG', 'Begin');
		logger.log(caller, 'DEBUG', 'Cookie: ' + this.cookie);
		if(cmd) {
			var cmdUrl = cmd.url;
			logger.log(caller, 'DEBUG', 'urlPath: ' + urlPath);
			if(urlPath)
				cmdUrl += urlPath;
			logger.log(caller, 'DEBUG', 'cmd.url: ' + cmdUrl);
			logger.log(caller, 'DEBUG', 'cmd.request: ' + cmd.request);
			var requestData = {
				url: cmdUrl,
				method: cmd.request
			}
			if(cmd.contentType)
				headers['Content-Type'] = cmd.contentType;
			if(sentData) {
				logger.log(caller, 'DEBUG', 'There is sentData');
				if(cmd.contentType.indexOf('json') >= 0) {
					logger.log(caller, 'DEBUG', 'Stringify JSON data before sending');
					sentData = JSON.stringify(sentData);
				}
				requestData.data = sentData;
				var sentDataLength = Buffer.byteLength(requestData.data, 'utf8');
				logger.log(caller, 'DEBUG', 'SentData length: ' + sentDataLength);
				headers['Content-Length'] = sentDataLength;
			}
			if(sentForm) {
				logger.log(caller, 'DEBUG', 'There is sentForm');
				requestData.form = sentForm;
			}
			if((type == 'user') && cmd.cookie) {
				logger.log(caller, 'DEBUG', 'Set Cookie');
				headers['Cookie'] = this.cookie;
			}
			requestData.headers = headers;
			requestData.host = this.url;
			requestData.port = this.port;
			logger.log(caller, 'DEBUG', 'Call httpClient.sendRequest');
			try {
				var result = await httpClient.sendRequest(requestData);
				if(result.ok && result.data == '') 
					logger.log(caller, 'DEBUG', 'No data received from server');
				else if(!result.ok)
					logger.log(caller, 'DEBUG', 'ERROR: httpClient.sendRequest result is ko');
				return(result);
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: httpClient.sendRequest failed');
				logger.error(caller, error);
				return {ok: false};
			}
		} else {
			logger.log(caller, 'ERROR', 'ERROR: command undefined for type ' + type);
			throw new Error('Command is missing');
		}
	}
	//getItemByName
	async getItemByName(item) {
		const caller = 'getItemByName';
		logger.log(caller, 'DEBUG', 'Begin');
		logger.log(caller, 'DEBUG', 'Look for item: ' + item.data.name);
		var attributes;
		try {
			var result = await this.getItems(item, attributes);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getItems result is ko'); 
				return(result);
			}
			logger.log(caller, 'DEBUG', 'getItems result is ok'); 
			var dsServerData = result.data;
			logger.log(caller, 'DEBUG', 'dsServerData length: ' + dsServerData.length); 
			var serverData;
			var found = false;
			var id = 0;
			while(!found && id<dsServerData.length) {
				switch(item.type) {
					case 'slideTemplate':
					case 'layoutTemplate':
					case 'device':
					case 'media':
					case 'slide':
					case 'variable':
					case 'web':
					case 'stream':
					case 'qrc':
					case 'role':
					case 'room':
					case 'organization':
					case 'playlist':
					case 'insert':
						if(dsServerData[id].title == item.data.name) {
							serverData = dsServerData[id];
							found = true;
							break;
						}
						break;
					case 'channel':
					case 'event':
					case 'feed':
					case 'layout':
						logger.log(caller, 'DEBUG', 'title: ' + dsServerData[id].title);
						if(dsServerData[id].title == item.data.name.toLowerCase()) {
							serverData = dsServerData[id];
							found = true;
							break;
						}
						break;
					case 'productContext':
						if(dsServerData[id].product_name == item.data.name) {
							serverData = dsServerData[id];
							found = true;
							break;
						}
						break;
					default:
						throw new Error('Item type not supported: ' + item.type);
				}
				id++;
			}
			if(!found) {
				logger.log(caller, 'ERROR', 'ERROR: Item not found: ' + item.data.name);
				return {ok: false, error: 'notFound'};
			}
			logger.log(caller, 'DEBUG', 'Item found: ' + item.data.name);
			return {ok: true, data: serverData};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItems failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//getItemListByNameList
	async getItemListByNameList(item, nameList) {
		const caller = 'getItemListByNameList';
		if(!['device', 'playlist', 'feed', 'variable'].includes(item.type)) {
			logger.log(caller, 'ERROR', 'ERROR: Get item list of unsupported type: ' + item.type);
			throw new Error('Bad item type: ' + item.type);
		}
		var itemList = [];
		var attributes;
		try {
			var result = await this.getItems(item, attributes);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getItems result is ko'); 
				return(result);
			}
			logger.log(caller, 'DEBUG', 'getItems result is ok');
			var dsServerData = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItems failed');
			logger.error(caller, error);
			return {ok: false};
		}
		for(let id=0; id<nameList.length; id++) {
			let itemName = nameList[id];
			logger.log(caller, 'INFO2', 'Looking for itemName: ' + itemName);
			let foundItem = dsServerData.filter((data) => data.title == itemName)[0];
			if(foundItem)
				itemList.push(foundItem);
			else {
				logger.log(caller, 'ERROR', 'ERROR: Item not found for type ' + item.type + ' and name: ' + itemName);
				return {ok: false};
			}
		}
		return {ok: true, data: itemList};
	}
	//getTemplateId
	async getTemplateId(templateName, templateType) {
		const caller = 'getTemplateId';
		logger.log(caller, 'DEBUG', 'templateName: ' + templateName);	
		//Get template data and content from the server
		try {
			var templateProfile = require('./' + templateType + '.json');
		} catch(error) {
			logger.log('server', 'ERROR', 'ERROR: Cannot get template profile. ' + error);
			logger.error(caller, error);
			throw new Error('Cannot get template id');
		}
		//Get template data and return template id
		var item = {type: 'template', profile: templateProfile, data: {name: templateName}};
		try {
			var result = await this.getItemByName(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getItemByName result is ko'); 
				return(result);
			}
			var templateId = result.data.id;
			logger.log(caller, 'INFO2', 'Template id: ' + templateId);				
			return {ok: true, data: templateId};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItemByName failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//getItems
	async getItems(item, attributes) {
		const caller = 'getItems';
		logger.log(caller, 'DEBUG', 'Begin');
		var headers = {};
		var urlPath;
		var sentData;
		var sentForm;
		var cmd = item.profile.cmdList[item.profile.cmd.get];
		if(attributes) {
			if(cmd.url.indexOf('?') >= 0)
				urlPath = '&' + attributes;
			else
				urlPath = '?' + attributes;
		}
		logger.log(caller, 'INFO2', 'urlPath: ' + urlPath);
		try {
			var result = await this.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
			return(result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//listItem
	async listItem(item) {
		const caller = 'listItem';
		var attributes = '';
		if(item.data && item.data.attributes) {
			for(var key in item.data.attributes) {
				if(attributes != '')
					attributes += '&';
				if(Array.isArray(item.data.attributes[key])) {
					attributes += key + '=[' + item.data.attributes[key] + ']';
				} else
				 	attributes += key + '=' + item.data.attributes[key];
			}
			logger.log(caller, 'INFO2', 'attributes: ' + attributes);
		}
		try {
			var result = await this.getItems(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getItems result is ko'); 
				return(result);
			}
			var serverData = result.data;
			logger.log(caller, 'DEBUG', 'Got list for ' + item.type + ', length: ' + serverData.length);
			serverData.forEach((data) => {
				for(var key in data)
					logger.log(caller, 'DEBUG', key + ': ' + JSON.stringify(serverData[key]));
			});	
			return {ok: true, data: serverData};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItems failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//deleteItem
	async deleteItem(item) {
		const caller = 'deleteItem';
		logger.log(caller, 'DEBUG', 'Begin');
		//Get item id
		try {
			var result = await this.getItemByName(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getItemByName result is ko'); 
				return(result);
			}
			var itemId = result.data.id;
			logger.log(caller, 'DEBUG', 'itemId: ' + itemId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItemByName failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Delete item
		var urlPath = '/' + itemId;
		logger.log(caller, 'DEBUG', 'urlPath: ' + urlPath);
		var headers = {};
		var sentData;
		var sentForm;
		var cmd = item.profile.cmdList[item.profile.cmd.delete];
		try {
			var result = await this.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
			return(result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}	
	}
	//deleteItemFromId
	async deleteItemFromId(item) {
		const caller = 'deleteItemFromId';
		logger.log(caller, 'DEBUG', 'Begin');
		var urlPath = '/' + item.data.id;
		logger.log(caller, 'DEBUG', 'urlPath: ' + urlPath);
		var headers = {};
		var sentData;
		var sentForm;
		var cmd = item.profile.cmdList[item.profile.cmd.delete];
		try {
			var result = await this.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
			return(result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//createItem
	async createItem(item) {
		const caller = 'createItem';
		logger.log(caller, 'DEBUG', 'Begin');
		var urlPath;
		if(item.urlPath)
			urlPath = item.urlPath;
		var headers = {};
		var sentData = item.data.createData;
		var sentForm;
		var cmd = item.profile.cmdList[item.profile.cmd.post];
		try {
			var result = await this.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
			return(result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//getItemContent
	async getItemContent(item) {
		const caller = 'getItemContent';
		//Get Id
		try {
			var result = await this.getItemByName(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getItemByName result is ko'); 
				return(result);
			}
			var itemId = result.data.id;
			logger.log(caller, 'DEBUG', 'itemId: ' + itemId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItemByName failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Get the content data from the id
		var urlPath = '/' + itemId;
		var headers = {};
		var sentData;
		var sentForm;
		var cmd = item.profile.cmdList[item.profile.cmd.getContent];
		try {
			var result = await this.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
			return(result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//getItemContentById
	async getItemContentById(item) {
		const caller = 'getItemContentById';
		//Get the content data from the id
		var urlPath = '/' + item.data.id;
		var headers = {};
		var sentData;
		var sentForm;
		var cmd = item.profile.cmdList[item.profile.cmd.getContent];
		try {
			var result = await this.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
			return(result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//uploadFile
	async uploadFile(fileDesc) {
		const caller = 'uploadFile';
		logger.log(caller, 'DEBUG', 'Path: ' + fileDesc.path);
		logger.log(caller, 'DEBUG', 'Url: ' + fileDesc.url);
		if(!fileDesc.url && !fileDesc.path) {
			logger.log(caller, 'ERROR', 'ERROR: no path or url specified in fileDesc');
			return {ok: false};
		}
		var uploadData = fileDesc.uploadData;
		//Create multipart body
		var form = new formData();
		//Create random uploadId
		if(uploadData.uploadId)
			form.append('id', uploadData.uploadId);
		if(uploadData.name)
			form.append('name', uploadData.name);
		if(uploadData.fileName)
			form.append('file_name', uploadData.fileName);
		if(uploadData.originalFileName)
			form.append('original_file_name', uploadData.originalFileName);
		if(uploadData.playlistId)
			form.append('playlist_id', uploadData.playlistId);
		if(uploadData.channelId)
			form.append('channel_id', uploadData.channelId);
		if(fileDesc.url)
			form.append('files[]', request(fileDesc.url));
		else
			form.append('files[]', fs.createReadStream(fileDesc.path));
		const getFormLength = async (form) => {
			return new Promise((resolve, reject) => {
				form.getLength((error, length) => {
					if(error)
						reject(error);
					else
						resolve(length);
				});
			});
		}
		try {
			var length = await getFormLength(form);
			logger.log(caller, 'INFO2', 'formData length: ' + length);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getFormLength failed');
			logger.error(caller, error);
			return {ok: false};
		}
		var urlPath;
		var headers = form.getHeaders();
		headers['Content-Length'] = length;
		var sentData;
		var sentForm = form;
		logger.log(caller, 'DEBUG', 'Cookie: ' + this.cookie);
		try {
			var result = await this.executeCmd('user', ApiConfig.cmdList.postFilesUploads, headers, urlPath, sentData, sentForm);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
				return(result);
			}
			var serverData = result.data.files[0];
			return {ok: true, data: serverData};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//postContentToItem
	async postContentToItem(item) {
		const caller = 'postContentToItem';
		//Get con tent id
		var contentName = item.data.contentName;
		var contentItem = {type: item.data.contentType, profile: item.contentProfile, data: {name: contentName}};
		try {
			var result = await this.getItemByName(contentItem);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getItemByName result is ko'); 
				return(result);
			}
			var contentId = result.data.id;
			logger.log(caller, 'DEBUG', 'Content name: ' + contentName + ', content Id: ' + contentId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItemByName failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Get item id
		try {
			var result = await this.getItemByName(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getItemByName result is ko'); 
				return(result);
			}
			var itemId = result.data.id;
			logger.log(caller, 'DEBUG', 'Item name: ' + item.data.name + ', item Id: ' + itemId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItemByName failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Post content
		var urlPath = '/' + itemId;
		var headers = {};
		var contentType = item.data.contentType;
		if((item.data.contentType == 'playlist') || (item.data.contentType == 'feed'))
			contentType = 'folder';
		var sentData = 'type=' + contentType + '&value=' + contentId + '&rank=1';
		if(item.data.rank)
			sentData += '&rank=' + item.data.rank;
		else
			sentData += '&rank=1';
		logger.log(caller, 'DEBUG', 'sentData: ' + sentData);
		var sentForm;
		var cmd = item.profile.cmdList[item.profile.cmd.postContent];
		try {
			var result = await this.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
			return(result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//postContentToItemFromId
	async postContentToItemFromId(item) {
		const caller = 'postContentToItemFromId';
		//Get media id
		var contentId = item.data.contentId;
		var itemId = item.data.id;
		//Post content
		var urlPath = '/' + itemId;
		var headers = {};
		var contentType = item.data.contentType;
		if((item.data.contentType == 'playlist') || (item.data.contentType == 'feed'))
			contentType = 'folder';
		var sentData = 'type=' + contentType + '&value=' + contentId + '&rank=1';
		if(item.data.rank)
			sentData += '&rank=' + item.data.rank;
		else
			sentData += '&rank=1';
		logger.log(caller, 'DEBUG', 'sentData: ' + sentData);
		var sentForm;
		var cmd = item.profile.cmdList[item.profile.cmd.postContent];
		try {
			var result = await this.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
			return(result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//publishItem
	async publishItem(item) {
		const caller = 'publishItem';
		//Get item id
		try {
			var result = await this.getItemByName(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getItemByName result is ko'); 
				return(result);
			}
			var itemId = result.data.id;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItemByName failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Publish item
		var urlPath = '/' + itemId;
		var headers = {};
		var sentData;
		var sentForm;
		var cmd = item.profile.cmdList[item.profile.cmd.postPublish];
		try {
			var result = await this.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
				return(result);
			}
			return {ok: true, data: result.data};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//publishItemById
	async publishItemById(item) {
		const caller = 'publishItemById';
		//Publish item
		var urlPath = '/' + item.data.id;
		var headers = {};
		var sentData;
		var sentForm;
		var cmd = item.profile.cmdList[item.profile.cmd.postPublish];
		try {
			var result = await this.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
				return(result);
			}
			return {ok: true, data: result.data};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	//deleteContentFromItem
	async deleteContentFromItem(item) {
		const caller = 'deleteContentFromItem';
		//Get item data
		try {
			var result = await this.getItemByName(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getItemByName result is ko'); 
				return(result);
			}
			var itemData = result.data;
			logger.log(caller, 'INFO2', 'getItemByName successful. ItemId: ' + itemData.id);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItemContent failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Get item content
		try {
			var result = await this.getItemContent(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getItemContent result is ko'); 
				return(result);
			}
			var itemContent = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItemContent failed');
			logger.error(caller, error);
			return {ok: false};
		}
		switch(item.type) {
			case 'channel':
			case 'playlist':
				var found = false;
				var id = 0;
				while(!found && id<itemContent.length) {
					if(itemContent[id].title == item.data.contentName) {
						found = true;
						logger.log(caller, 'INFO2', 'Found content: ' + item.data.contentName);
						//Delete found content then
						var urlPath = '/' + itemData.id + '/' + itemContent[id].id;
						var headers = {};
						var sentData;
						var sentForm;
						var cmd = item.profile.cmdList[item.profile.cmd.deleteContent];
						try {
							var result = await this.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
							if(!result.ok) {
								logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
								return(result);
							}
							return {ok: true, data: result.data};
						} catch(error) {
							logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
							logger.error(caller, error);
							return {ok: false};
						}
					}
					id++;
				}
				if(!found) {
					logger.log(caller, 'ERROR', 'ERROR: Content not found: ' + item.data.contentName + ' in ' + item.type + ' ' + item.data.name);
					throw new Error('Content not found');
				}
				break;
			default:
				logger.log(caller, 'ERROR', 'ERROR: Type not supported: ' + item.type);
				throw new Error('Bad type: ' + item.type);
		}
	}
	async itemExist(item) {
		const caller = 'itemExist';
		//Get the item data from its name
		try {
			var result = await this.getItemByName(item);
			if(!result.ok && result.error != 'notFound') {
				logger.log(caller, 'INFO2', 'ERROR: getItemByName result is ko'); 
				return(result);
			} else if (!result.ok && result.error == 'notFound') {
				logger.log(caller, 'DEBUG', 'Item does not exist: ' + item.data.name);
				return {ok: true, data: false}
			} else
				return {ok: true, data: true};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItemByName failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	async getNbContent(item) {
		const caller = 'getNbContent';
		//Get item content
		try {
			var result = await this.getItemContent(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getItemContent result is ko'); 
				return(result);
			}
			var itemContent = result.data;
		}  catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItemContent failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//Return nb of content
		var nbContent = 0;
		switch(item.type) {
			case 'playlist':
			case 'channel':
				for(var id=0; id<itemContent.length; id++) {
					if(itemContent[id].title == item.data.contentName) {
						nbContent ++;
						logger.log(caller, 'INFO2', 'Found one instance of entity: ' + item.data.contentName);
					}
				}
				break;
			case 'feed':
				nbContent = itemContent.length;
				break;
			default:
				logger.log(caller, 'ERROR', 'ERROR: Type not supported: ' + item.type);
				throw new Error('Unsuported type: ' + item.type);
				break;
		}
		return {ok: true, data: nbContent};
	}
	async getItemDataById(item) {
		const caller = 'getItemDataById';
		if(item.type == 'feed') {
			if(!item.data.type) {
				logger.log(caller, 'ERROR', 'ERROR: item.data.type is mandatory for feed get data');
				return {ok: false};
			}
			var feedType = 'unknown';
			if(item.data.type == 'ftp_feed')
				feedType = 'ftp';
			else if(item.data.type == 'user_feed')
				feedType = 'rss';
			else if(item.data.type == 'xml_feed')
				feedType = 'xml';
			if(feedType == 'unknown') {
				logger.log(caller, 'ERROR', 'ERROR: Bad feed item.data.type: ' + item.data.type);
				throw new Error('Unsuported type: ' + item.data.type);
			}
			logger.log(caller, 'INFO2', 'feedType: ' + feedType);
			var urlPath = '/' + feedType + '/' + item.data.id;
			var cmd = item.profile.cmdList[item.profile.cmd.getData];
		} else {
			var urlPath = '/' + item.data.id;
			var cmd = item.type == 'slide' ? item.profile.cmdList[item.profile.cmd.getData] : item.profile.cmdList[item.profile.cmd.get];
		}
		var headers = {};
		var sentData;
		var sentForm;
		try {
			var result = await this.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: executeCmd result is ko'); 
			return(result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	async getItemData(item) {
		const caller = 'getItemData';
		//Get item id
		try {
			var result = await this.getItemByName(item);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getItemByName result is ko'); 
				return(result);
			}
			if(item.data)
				item.data.id = result.data.id;
			else
				item.data = {id: result.data.id};
			logger.log(caller, 'INFO2', 'Item id: ' + item.data.id);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItemByName failed');
			logger.error(caller, error);
			return {ok: false};
		}
		//WArning: if type is feed we must set the feed subtype value (ftp_feed/user_feed/xml_feed) in item.data.type
		if(item.type == 'feed')
			item.data.type = result.data.subtype;
		//Get item data		
		try {
			var result = await this.getItemDataById(item);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: getItemDataById result is ko'); 
			return(result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getItemDataById failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
}
module.exports = ApiCore;