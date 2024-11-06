const fs = require('fs')
const util = require('util');
const readline = require('readline');
const {google} = require('googleapis');
const { resolve } = require('path');
const { rejects } = require('assert');
const { drive } = require('googleapis/build/src/apis/drive');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'googleApi');
try {
	var config = require('./googleApi.json');
} catch(error) {
	logger.log(__filename, 'ERROR', "ERROR: Cannot get config file. " + error);
	process.exit();
}
/*--------------------------------------------------------------------------------------------
		GoogleApi
---------------------------------------------------------------------------------------------*/
class GoogleApi {
	constructor() {
        var caller = 'GoogleApi';
        this.scopes = config.scopes;
        this.credentialsPath = config.credentialsPath;
        this.tokenPath = config.tokenPath;
        this.oAuth2Client;
    }
    async connect() {
        var caller = 'connect';
        const readFile = util.promisify(fs.readFile);
        //Read credentials data from file
        try {
            var data = await readFile(this.credentialsPath);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: readFile failed');
            logger.error(caller, error);
            return {ok: false};
        }
        //Parse credentials
        try {
            var credentials = JSON.parse(data);
        } catch (error) {
            logger.log(caller, 'ERROR', 'ERROR: JSON.parse failed. Error: ' + error);
            logger.error(caller, error);
            return {ok: false};
        }
        logger.log(caller, 'INFO2', 'client_id: ' + credentials.installed.client_id);
        //Get authentication client
        const {client_secret, client_id, redirect_uris} = credentials.installed;
        try {
            //Set authentication client
            this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: google.auth.OAuth2 failed');
            logger.error(caller, error);
            return {ok: false};
        }
        //Read token from file
        try {
            var data = await readFile(this.tokenPath);
            //Parse token
            try {
                var token = JSON.parse(data);
                try {
                    this.oAuth2Client.setCredentials(token);
                } catch (error) {
                    logger.log(caller, 'ERROR', 'ERROR: setCredentials failed. Error: ' + error);
                    logger.error(caller, error);
                    return {ok: false};
                }
                return {ok: true};
            } catch (error) {
                logger.log(caller, 'ERROR', 'ERROR: JSON.parse failed. Error: ' + error);
                //Previous token cannot be parsed
                //Set new token
                try {
                    var result = await this.setNewToken();
                    if(!result.ok)
                        logger.log(caller, 'DEBUG', 'ERROR: setNewToken result is ko');
                    return result;
                } catch (error) {
                    logger.log(caller, 'ERROR', 'ERROR: setNewToken failed. Error: ' + error);
                    logger.error(caller, error);
                    return {ok: false};
                }
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: readFile failed: ' + error);
            //Token file does not exist yet. We must get a new token and store it into file
            //Set new token
            try {
                var result = await this.setNewToken();
                if(!result.ok)
                    logger.log(caller, 'DEBUG', 'ERROR: setNewToken result is ko');
                return result;
            } catch (error) {
                logger.log(caller, 'ERROR', 'ERROR: setNewToken failed. Error: ' + error);
                logger.error(caller, error);
                return {ok: false};
            }
        }
    }
    async requestToken() {
        var caller = 'requestToken';
        return new Promise((resolve, reject) => {
            try {
                var authUrl = this.oAuth2Client.generateAuthUrl({access_type: 'offline', scope: this.scopes});
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: oAuth2Client.generateAuthUrl failed. Error: ' + error);
                logger.error(caller, error);
                reject({ok: false});
            }
            logger.log(caller, 'INFO0', 'You must authorize this app by visiting this url:' + authUrl);
            var rl = readline.createInterface({input: process.stdin, output: process.stdout});
            rl.question('Enter the code from that page here: ', (code) => {
                rl.close();
                this.oAuth2Client.getToken(code, (error, token) => {
                    if (error) {
                        logger.log(caller, 'ERROR', 'ERROR: oAuth2Client.getToken failed: ' + error);
                        reject({ok: false});
                    }
                    resolve({ok: true, data: token})
                });
            });
        });
    }
    async setNewToken() {
        var caller = 'setNewToken';
        //Get new token
        try {
            var result = await this.requestToken();
            if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: getNewToken result is ko');
                return {ok: false};
            }
            var token = result.data;
        } catch (error) {
            logger.log(caller, 'ERROR', 'ERROR: getNewToken failed. Error: ' + error);
            logger.error(caller, error);
            return {ok: false};
        }
        logger.log(caller, 'INFO0', 'Store token into file'); 
        //Write token into file for later use
        const writeFile = util.promisify(fs.writeFile);
        //Read credentials data from file
        try {
            await writeFile(this.tokenPath, JSON.stringify(token));
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: writeFile failed');
            logger.error(caller, error);
        }
        //Set oauth credentials with new token
        try {
            this.oAuth2Client.setCredentials(token);
        } catch (error) {
            logger.log(caller, 'ERROR', 'ERROR: setCredentials failed. Error: ' + error);
            logger.error(caller, error);
            return {ok: false};
        }
        return {ok: true};
    }
    async getDriveFileList(params) {
        var caller = 'getDriveFileList';
        if(typeof(this.oAuth2Client) == 'undefined') {
            logger.log(caller, 'ERROR', 'ERROR: oAuth2Client is undefined');
            throw new Error('Not authorized yet. Cannot read data');
        }
        const drive = google.drive('v3');
        google.options({auth: this.oAuth2Client});
        try {
            var data = await drive.files.list(params);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: drive.files.list failed');
            logger.error(caller, error);
            return {ok: false};
        }
        return {ok: true, data: data};
    }
    async getDriveFile(params) {
        var caller = 'getDriveFile';
        if(typeof(this.oAuth2Client) == 'undefined') {
            logger.log(caller, 'ERROR', 'ERROR: oAuth2Client is undefined');
            throw new Error('Not authorized yet. Cannot read data');
        }
        const drive = google.drive('v3');
        google.options({auth: this.oAuth2Client});
        try {
            var data = await drive.files.get(params);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: drive.files.get failed');
            logger.error(caller, error);
            return {ok: false};
        }
        return {ok: true, data: data};
    }
    async getDriveFileExist(fileName) {
        var caller = 'getDriveFileExist';
        try {
			let result = await this.getDriveFileList({fields: 'files(name)'});
			if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: googleApi.getDriveFilesList result is ko');
                return {ok: false};
			}
			var data = result.data;
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: googleApi.getDriveFilesList failed');
            logger.error(caller, error);
			return {ok: false};
		}
        var files = data.data.files;
        var exist = false;
		for(let id=0; id<files.length; id++) {
			if(files[id].name == fileName) {
                exist = true;
                break;
			}
		}
        return {ok: true, data: exist};
    }
    async getDriveFileId(fileName) {
        var caller = 'getDriveFileId';
        try {
			let result = await this.getDriveFileList({fields: 'files(id, name)'});
			if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: googleApi.getDriveFilesList result is ko');
                return {ok: false};
			}
			var data = result.data;
		} catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: googleApi.getDriveFilesList failed');
            logger.error(caller, error);
			return {ok: false};
		}
		var files = data.data.files;
		for(let id=0; id<files.length; id++) {
			if(files[id].name == fileName) {
				var fileId = files[id].id;
			}
		}
		if(!fileId) {
			logger.log(caller, 'ERROR', 'ERROR: Sheet not found: ' + fileName);
			return {ok: false};
        }
        return {ok: true, data: fileId};
    }
    async getDriveFileModifiedTimeById(fileId) {
        var caller = 'getDriveFileModifiedTimeById';
        if(typeof(this.oAuth2Client) == 'undefined') {
            logger.log(caller, 'ERROR', 'ERROR: oAuth2Client is undefined');
            throw new Error('Not authorized yet. Cannot read data');
        }
        const drive = google.drive('v3');
        google.options({auth: this.oAuth2Client});
        try {
            var data = await drive.files.get({fileId: fileId, fields: 'modifiedTime, modifiedByMeTime'});
            logger.log(caller, 'DEBUG', 'result: ' + JSON.stringify(data.data));
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: drive.files.get failed');
            logger.error(caller, error);
            return {ok: false};
        }
        return {ok: true, data: data.data.modifiedTime};
    }
    async getDriveFileModifiedTimeByName(filename) {
        var caller = 'getDriveFileModifiedTimeByName';
        if(typeof(this.oAuth2Client) == 'undefined') {
            logger.log(caller, 'ERROR', 'ERROR: oAuth2Client is undefined');
            throw new Error('Not authorized yet. Cannot read data');
        }
        const drive = google.drive('v3');
        google.options({auth: this.oAuth2Client});
        try {
			let result = await googleApi.getDriveFileId(filename);
			if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: googleApi.getDriveFileId result is ko');
                return {ok: false};
			}
			var fileId = result.data;
			logger.log(caller, 'INFO2', 'SheetId: ' + fileId);
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: googleApi.getDriveFileId failed');
			logger.error(caller, error);
            return {ok: false};
		}
        try {
            var data = await drive.files.get({fileId: fileId, fields: 'modifiedTime'});
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: drive.files.get failed');
            logger.error(caller, error);
            return {ok: false};
        }
        return {ok: true, data: data.data.modifiedTime};
    }
    async getSheet(sheetId) {
        var caller = 'getSheet';
        if(typeof(this.oAuth2Client) == 'undefined') {
            logger.log(caller, 'ERROR', 'ERROR: oAuth2Client is undefined');
            throw new Error('Not authorized yet. Cannot read data');
        }
        const sheets = google.sheets({version: 'v4', auth: this.oAuth2Client});
        try {
            var data = await sheets.spreadsheets.get({spreadsheetId: sheetId});
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: sheets.spreadsheets.get failed');
            logger.error(caller, error);
            throw new Error('Cannot get data from spreadSheet');
        }
        return {ok: true, data: data};
    }
    async getSheetValues(sheetId, cellRange, majorDimension) {
        var caller = 'getSheetValues';
        if(typeof(this.oAuth2Client) == 'undefined') {
            logger.log(caller, 'ERROR', 'ERROR: oAuth2Client is undefined');
            throw new Error('Not authorized yet. Cannot read data');
        }
        const sheets = google.sheets({version: 'v4', auth: this.oAuth2Client});
        try {
            var data = await sheets.spreadsheets.values.get({spreadsheetId: sheetId, range: cellRange, majorDimension: majorDimension});
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: sheets.spreadsheets.values.get failed');
            logger.error(caller, error);
            return {ok: false};
        }
        return {ok: true, data: data};
    }
    async updateSheetValues(sheetId, cellRange, resource) {
        var caller = 'updateSheetValues';
        if(typeof(this.oAuth2Client) == 'undefined') {
            logger.log(caller, 'ERROR', 'ERROR: oAuth2Client is undefined');
            throw new Error('Not authorized yet. Cannot read data');
        }
        const sheets = google.sheets({version: 'v4', auth: this.oAuth2Client});
        try {
            var data = await sheets.spreadsheets.values.update({spreadsheetId: sheetId, range: cellRange, valueInputOption: 'USER_ENTERED', resource: resource});
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: sheets.spreadsheets.values.update failed');
            logger.error(caller, error);
            return {ok: false};
        }
        return {ok: true, data: data};
    }
}
module.exports = GoogleApi;