const Generic = require('./Generic.js');
var Organization = require('./organization.js');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'room');
var TYPE = 'room';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get profile. " + error);
	process.exit();
}
/*--------------------------------------------------------------------------------------------
		Room
---------------------------------------------------------------------------------------------*/
class Room {
	constructor(apiCore) {
        this.apiCore = apiCore;
		this.profile = PROFILE;
		this.type = TYPE;
		this.generic = new Generic(this.apiCore, this.type, this.profile, this.getCreateInfo);
    }
    async getCreateInfo(data) {
		var caller = 'getCreateInfo';
        var createData = { ...PROFILE.createData };
		createData.title = data.name;
		createData.number = data.number;
		createData.capacity = data.capacity;
		createData.building = data.building;
		createData.floor = data.floor;
		createData.description = data.description;
		var organization = new Organization(this.apiCore);
		var orgaData = {};
		try {
			let result = await organization.getContext(orgaData);
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: apiCore.executeCmd result is ko');
			else
				logger.log(caller, 'INFO0', 'Layout ' + data.name + ' has been generated');
			createData.organisation_id = result.data.id;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
			return {ok: false};
		}
		var createInfo = {createData: createData, urlPath: null};
		return {ok: true, data: createInfo};
	}
	async postBooking(data) {
        var caller = 'postBooking';
		var urlPath = '', headers = {}, sentForm;
		var roomData = {name: data.room};
		try {
			let result = await this.getId(roomData);
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: getId result is ko');
				return result;
			}
			var roomId = result.data;
			logger.log(caller, 'INFO2', 'roomId: ' + roomId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getId failed');
			return {ok: false};
		}
		var startDateTime = data.startDate + ' ' + data.startHour + ':' + data.startMin + ':00';
		var endDateTime = data.endDate + ' ' + data.endHour + ':' + data.endMin + ':00';
		var startTimeStamp = new Date(startDateTime).getTime();
		var endTimeStamp = new Date(endDateTime).getTime();
		var sentData = {
			start_datetime: startDateTime,
			end_datetime: endDateTime,
			room_id: roomId,
			exchangeEmail: null,
			change: true,
			link: "#booking/calendar/undefined",
			start_date: data.startDate,
			start_hour: data.startHour,
			start_min: data.startMin,
			start_timestamp: startTimeStamp,
			end_date: data.endDate,
			end_hour: data.endHour,
			end_min: data.endMin,
			end_timestamp: endTimeStamp,
			title: data.name
		}
		logger.log(caller, 'DEBUG', 'SentData: ' + JSON.stringify(sentData));
		var cmd = this.profile.cmdList[this.profile.cmd.postBooking];
		try {
			let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: apiCore.executeCmd result is ko');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
			return {ok: false};
		}
	}
	async create(data) {return await this.generic.create(data).catch((error) => {logger.log('create', 'ERROR', 'ERROR: generic.create failed'); return {ok: false};})};
	async delete(data) {return await this.generic.delete(data).catch((error) => {logger.log('delete', 'ERROR', 'ERROR: generic.delete failed'); return {ok: false};})};
	async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); return {ok: false};})};
    async getData(data) {return await this.generic.getData(data).catch((error) => {logger.log('getData', 'ERROR', 'ERROR: generic.getData failed'); return {ok: false};})};
	async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); return {ok: false};})};
}
module.exports = Room;