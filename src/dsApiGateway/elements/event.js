const Generic = require('./Generic.js');
var Channel = require('./channel');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'event');
var TYPE = 'event';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get  " + error);
	process.exit();
}
/*--------------------------------------------------------------------------------------------
		Event
---------------------------------------------------------------------------------------------*/
class Event {
	constructor(apiCore) {
        this.apiCore = apiCore;
        this.type = TYPE;
		this.profile = PROFILE;
		this.generic = new Generic(this.apiCore, this.type, this.profile, this.getCreateInfo);
	}
	//getCreateInfo - Called when creating a new event
    async getCreateInfo(data) {
		var caller = 'getCreateInfo';
		var createData = { ...PROFILE.createData };
		//Get channel id
		var channel = new Channel(this.apiCore);
		//Get channel id
		try {
			let result = await channel.getId({name: data.channel});
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: getId result is ko');
				return result;
			}
			data.channelId = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getId failed');
			return {ok: false};
		}
		//Get device info from the list
		try {
			var deviceProfile = require('./device.json');
		} catch(error) {
			logger.log('server', 'ERROR', "ERROR: Cannot get device profile. " + error);
			return callback(error);
		}
		//Get information about devices
		var deviceItem = {type: 'device', profile: deviceProfile};
		try {
			let result = await this.apiCore.getItemListByNameList(deviceItem, data.deviceList);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: apiCore.getItemListByNameList result is ko');
				return result;
			}
			var deviceList = result.data;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.getItemListByNameList failed');
			return {ok: false};
		}
		if(deviceList.length <= 0) {
			logger.log(caller, 'ERROR', 'ERROR: None device exist on the server');
			throw new Error('No device found');
		}
		//Create event and data to be checked afterwards
		var rightsDevices = new Array();
		for(var id=0; id<deviceList.length; id++)
			rightsDevices[rightsDevices.length] = deviceList[id].id;
		data.rightsDevices = rightsDevices;
		if(data.start)
			var startDate = new Date(data.start).getTime();
		else if (data.startInMin)
			var startDate = new Date().getTime() + (data.startInMin * 60 * 1000);
		else {
			logger.log(caller, 'ERROR', 'ERROR: No start nor startInMin date specified');
			throw new Error('Start date is missing');
		}
		if(data.end)
			var endDate = new Date(data.end).getTime();
		else if (data.endInMin)
			var endDate = new Date().getTime() + (data.endInMin * 60 * 1000);
		else {
			logger.log(caller, 'ERROR', 'ERROR: No end nor endInMin date specified');
			throw new Error('End date is missing');
		}
		createData.title = data.name;
		createData.channel_id = data.channelId;
		createData.type_event = data.type;
		createData.description = data.description;
		createData.start_datetime = startDate;
		createData.end_datetime = endDate;
		createData.rights_devices = data.rightsDevices;
		createData.channelName = data.channel;
		var createInfo = {createData: createData, urlPath: null};
		return {ok: true, data: createInfo};
	}
	async checkData(data) {return await this.generic.checkData(data).catch((error) => {logger.log('checkData', 'ERROR', 'ERROR: generic.checkData failed'); logger.error(caller, error); return {ok: false};})};
	async create(data) {return await this.generic.create(data).catch((error) => {logger.log('create', 'ERROR', 'ERROR: generic.create failed'); logger.error(caller, error); return {ok: false};})};
	async delete(data) {return await this.generic.delete(data).catch((error) => {logger.log('delete', 'ERROR', 'ERROR: generic.delete failed'); logger.error(caller, error); return {ok: false};})};
    async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); logger.error(caller, error); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); logger.error(caller, error); return {ok: false};})};
	async getData(data) {return await this.generic.getData(data).catch((error) => {logger.log('getData', 'ERROR', 'ERROR: generic.getData failed'); logger.error(caller, error); return {ok: false};})};
	async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); logger.error(caller, error); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); logger.error(caller, error); return {ok: false};})};
}
module.exports = Event;