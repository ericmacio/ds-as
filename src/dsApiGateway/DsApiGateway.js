const ApiCore = require('./ApiCore.js');
const elements = require('./elements');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'DsApiGateway');
const TOKEN_TIMER_S = 300;
/*--------------------------------------------------------------------------------------------
		DsApiGateway
---------------------------------------------------------------------------------------------*/
class DsApiGateway {
	constructor({apiUrl, apiPort, user, password}) {
		const caller = 'DsApiGateway';
		this.apiUrl = apiUrl;
		this.apiPort = apiPort;
		this.user = user;
		this.password = password;
		//Create ApiCore instance with connection data from DS server
		//It will provide full access to the dS Server API
		this.apiCore = new ApiCore(this.apiUrl, this.apiPort, this.user, this.password);
		this.api = {};
	}
	//getApi
	async getApi() {
		const caller = 'getApi';
		//First set API version to apicore so that elements can get synchronous access to it
		try {
			//Get API version from the server
			var result = await this.apiCore.setVersion();
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: apiCore.setVersion result is ko'); 
				return(result);
			}
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.setVersion failed ' + error);
			logger.error(caller, error);
			return({ok: false});
		}
		for(var key in elements) {
			logger.log(caller, 'INFO2', 'Add ' + key + ' to API');
			//Add entry point for this element. Force reference to lower case for ease of use. Warning, Cookie is not yet set at this time
			this.api[key] = new elements[key](this.apiCore);
		}
		return ({ok: true, data: this.api});
	}
	//connect
	async connect() {
		const caller = 'connect';
		try {
			var result = await this.connectToDsServer();
			if(!result.ok)
				logger.log(caller, 'DEBUG', 'ERROR: connectToDsServer result is ko'); 
			return(result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: connectToDsServer failed ' + error);
			logger.error(caller, error);
			return({ok: false});
		}
	}
	//disConnect
	async disConnect() {
		const caller = 'disConnect';
		if(this.tokenTimeout) clearTimeout(this.tokenTimeout);
		try {
			var result = await this.apiCore.logout();
			if(!result.ok) {
				logger.log(caller, 'DEBUG', 'ERROR: apiCore.logout result is ko'); 
				return(result);
			}
			return {ok: true};
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: apiCore.logout failed ' + error);
			logger.error(caller, error);
			return({ok: false});
		}
	}
	//connectToDsServer
	async connectToDsServer() {
		const caller = 'connectToDsServer';
		//isTokenValid
		const isTokenValid = async() => {
			const caller = 'isTokenValid';
			//Ask the server if the token is still valid
			logger.log(caller, 'INFO2', 'Check token is still valid. Token: ' + this.token);
			try {
				var result = await this.apiCore.isTokenValid();
				if(!result.ok) {
					logger.log(caller, 'DEBUG', 'ERROR: apiCore.isTokenValid result is ko'); 
					return(result);
				}
				var tokenIsValid = result.data;
				if(tokenIsValid) {
					//Token is still valid so nothing else to do than restart periodic check
					logger.log(caller, 'INFO2', 'Token is valid');
					//Re-start periodic check of token
					this.tokenTimeout = setTimeout(() => {isTokenValid();}, TOKEN_TIMER_S * 1000);
				} else {
					//Token is no longer valid. We need to get a new one
					logger.log(caller, 'WARNING', 'WARNING: Token is no longer valid');
					await getToken();
				}
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: apiCore.isTokenValid failed');
				return {ok: false};
			}
		}
		//getToken
		const getToken = async() => {
			const caller = 'getToken';
			try {
				//Get a valid token from the server
				var result = await this.apiCore.authenticate(this.apiUrl, this.user, this.password);
				if(!result.ok) {
					logger.log(caller, 'DEBUG', 'ERROR: apiCore.authenticate result is ko'); 
					return(result);
				}
				this.token = result.data;
				logger.log(caller, 'INFO1', 'New token: ' + this.token);
				//Set ApiCore with cookie value
				this.apiCore.setCookie('accounttoken=' + this.token);
				//Re-start periodic check of token
				this.tokenTimeout = setTimeout(() => {isTokenValid();}, TOKEN_TIMER_S * 1000);
				return {ok: true};			
			} catch(error) {
				logger.log(caller, 'ERROR', 'ERROR: apiCore.authenticate failed. ' + error.message);
				return {ok: false};
			}
		}
		logger.log(caller, 'DEBUG', 'Connecting to server: ' + this.apiUrl);
		//Get a valid token from the server
		try {
			var result = await getToken();
			if(!result.ok) 
				logger.log(caller, 'DEBUG', 'ERROR: getToken result is ko'); 
			return(result);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: getToken failed. ' + error.message);
			return {ok: false};
		}
	}
	//getUrl
	getUrl() {
		const caller = 'getUrl';
		return this.apiUrl;
	}
	//getUser
	getUser() {
		const caller = 'getUser';
		return this.user;
	}
}
module.exports = DsApiGateway;