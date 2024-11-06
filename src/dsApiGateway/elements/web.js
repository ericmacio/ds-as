const Generic = require('./Generic.js');
var Logger = require('../../logging/logger');
var logger = new Logger(__filename, 'web');
var TYPE = 'web';
try {
	var PROFILE = require('./' + TYPE + '.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get profile. " + error);
	process.exit();
}
/*--------------------------------------------------------------------------------------------
		Web
---------------------------------------------------------------------------------------------*/
class Web {
	constructor(apiCore) {
        this.apiCore = apiCore;
		this.profile = PROFILE;
		this.type = TYPE;
		this.generic = new Generic(this.apiCore, this.type, this.profile, this.getCreateInfo);
    }
    async getCreateInfo(data) {
        var createData = { ...PROFILE.createData };
        //Warning: for now the web link us used as media title
        createData.title = data.name;
		createData.url = data.url;
        var createInfo = {createData: createData, urlPath: null};
        return {ok: true, data: createInfo};
	}
	async create(data) {return await this.generic.create(data).catch((error) => {logger.log('create', 'ERROR', 'ERROR: generic.create failed'); return {ok: false};})};
	async delete(data) {return await this.generic.delete(data).catch((error) => {logger.log('delete', 'ERROR', 'ERROR: generic.delete failed'); return {ok: false};})};
    async exist(data) {return await this.generic.exist(data).catch((error) => {logger.log('exist', 'ERROR', 'ERROR: generic.exist failed'); return {ok: false};})};
	async get(data) {return await this.generic.get(data).catch((error) => {logger.log('get', 'ERROR', 'ERROR: generic.get failed'); return {ok: false};})};
	async getId(data) {return await this.generic.getId(data).catch((error) => {logger.log('getId', 'ERROR', 'ERROR: generic.getId failed'); return {ok: false};})};
	async list(data) {return await this.generic.list(data).catch((error) => {logger.log('list', 'ERROR', 'ERROR: generic.list failed'); return {ok: false};})};
}
module.exports = Web;