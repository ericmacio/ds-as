const Generic = require('./Generic.js');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'role');
var TYPE = 'role';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get profile. " + error);
	process.exit();
}
/*--------------------------------------------------------------------------------------------
		Role
---------------------------------------------------------------------------------------------*/
class Role {
	constructor(apiCore) {
        this.apiCore = apiCore;
		this.profile = PROFILE;
		this.type = TYPE;
		this.generic = new Generic(this.apiCore, this.type, this.profile, this.getCreateInfo);
    }
    async getCreateInfo(data) {
        var createData = { ...PROFILE.createData };
        createData.title = data.name;
        var createInfo = {createData: createData, urlPath: null};
        return {ok: true, data: createInfo};
	}
	async setActionList(data) {
		const caller = 'setActionList';
		//Get role id
        try {
			var result = await this.getId(data);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: getId result is ko');
				return result;
			}
			var roleId = result.data;
			logger.log(caller, 'INFO2', 'Role id: ' + roleId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getData failed');
			logger.error(caller, error);
			return {ok: false};
		}
		var sentForm;
		var headers = {};
		var urlPath = '/' + roleId;
		var sentData = {};
		sentData.actions = [...data.actions];
        var cmd = this.profile.cmdList[this.profile.cmd.putAction];
        try {
			let result = await this.apiCore.executeCmd('user', cmd, headers, urlPath, sentData, sentForm);
			if(!result.ok)
				logger.log(caller, 'INFO2', 'ERROR: apiCore.executeCmd result is ko');
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.executeCmd failed');
			logger.error(caller, error);
			return {ok: false};
		}
	}
	async create(data) {return await this.generic.create(data).catch((error) => {logger.log('create', 'ERROR', 'ERROR: generic.create failed'); return {ok: false};})};
	async delete(data) {return await this.generic.delete(data).catch((error) => {logger.log('delete', 'ERROR', 'ERROR: generic.delete failed'); return {ok: false};})};
    async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); return {ok: false};})};
	async getData(data) {return await this.generic.getData(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); return {ok: false};})};
	async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); return {ok: false};})};
}
module.exports = Role;