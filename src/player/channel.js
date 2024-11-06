const util = require('util');
const fs = require('fs');
const api = require('./api');
const medias = require('./medias');
const lisFile = require('./lisFile');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'channel');
//Playlist hexa code for prg file
const PRG_FEED_IDENTIFIER = [
    {
        type: 'playlist',
        typeHexa: ['7','0','6','C','6','1','7','9','6','C','6','9','7','3','7','4','0','0','0','0'],
        length: 80,
        offset: 128
    },
    {
        type: 'rss_feed',
        typeHexa: ['7','2','7','3','7','3','5','F','6','6','6','5','6','5','6','4','0','0','0','0'],
        length: 80,
        offset: 128
    }
];

exports.getContent = async(server, playerId, configValues, mediaLibrary) => {
    const caller = 'getContent';
    var urlPath = '/' + playerId + '?device_type=' + configValues.device_type + '&ip=' + configValues.ip;
    try {
        const result = await api.executeCmd(server.host, server.port, 'getChannelToBroadcast', urlPath, null);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: api.executeCmd result is ko');
            return {ok: false};
        }
        var serverData = result.data;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: api.executeCmd failed');
        logger.error(caller, error);
        return {ok: false};
    }
    if(serverData['server_response']['screen_details']) {
        var screenDetails = serverData['server_response']['screen_details'][0]['$'];
        //Create channelContentInfo
        var channelContentInfo = ChannelContentInfo('getChannelToBroadcast', screenDetails);
        logger.log(caller, 'DEBUG',  'channelContentInfo: ' + JSON.stringify(channelContentInfo));
        //Clear current channel library content
        try {
            const result = await medias.clearContent(mediaLibrary.channelLibrary);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: medias.clearContent result is ko');
                return {ok: false};
            }
        }
        catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: medias.clearContent failed');
            logger.error(caller, error);
            return {ok: false};
        }
        //Get lis file for this channel
        try {
            const result = await lisFile.getLisFileInfo(channelContentInfo, mediaLibrary.channelLibrary);
            logger.log(caller, 'DEBUG', 'listFile.getLisFileInfo result: ' + JSON.stringify(result));
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: listFile.getLisFileInfo result is ko');
                return {ok: false};
            }
            //Store lis data
            var lisData = result.data;
        }
        catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: getLisFileInfo failed');
            logger.error(caller, error);
            return {ok: false};
        }
        //Download all files specified in lis file
        try {
            const result = await medias.getAllMediasFromServer(lisData.lisFileList, mediaLibrary.channelLibrary);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: medias.getAllMediasFromServer result is ko');
                return {ok: false};
            }
        }
        catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: medias.getAllMediasFromServer failed');
            logger.error(caller, error);
            return {ok: false};
        }
        //Get prg file name from lis file content (should be [channel].prg ...)
        var prgFileList = lisFile.getPrgFileListFromLisData(lisData.lisFileList);
        logger.log(caller, 'INFO2',  'prgFileList length: ' + prgFileList.length);
        var folders = [];
        folders[0] = {type: 'channel', id: channelContentInfo.id, name: channelContentInfo.name, version: channelContentInfo.version};
        getIdentifier = async(prgFile) => {
            logger.log(caller, 'INFO2',  'prgFile: ' + prgFile);
            //Get the list of the playlist identifier from the prg file content
            try {
                const result = await getPlaylistIdentifierListFromPrgFile(prgFile, mediaLibrary.channelLibrary);
                if(!result.ok) {
                    logger.log(caller, 'INFO2', 'ERROR: getPlaylistIdentifierListFromPrgFile result is ko');
                    return {ok: false};
                }
                var playlistIdentifierList = result.data;
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: getPlaylistIdentifierListFromPrgFile failed');
                logger.error(caller, error);
                return {ok: false};
            }
            logger.log(caller, 'INFO2',  'playlistIdentifierList length: ' + playlistIdentifierList.length);
            for(let i=0; i<playlistIdentifierList.length; i++) {
                //VERSION MUST NOT BE NULL but set with current value if already exist !
                folders.push({type: playlistIdentifierList[i].type, id: playlistIdentifierList[i].id, version: 0});
                logger.log(caller, 'INFO2', 'Playlist identifier: ' + folders[folders.length-1].id);
            };
            return {ok: true};
        }
        const getAllIdentifier = prgFileList.map((prgFile) => {return getIdentifier(prgFile)});
        try {
            const resultList = await Promise.all(getAllIdentifier);
            //Check the global status
            const allOk = resultList.find(result => !result.ok) ? false : true;
            if(!allOk)
                return{ok: false};
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: getAllIdentifier failed');
            logger.error(caller, error);
            return {ok: false};
        }
        if(prgFileList.length == 0)
            logger.log(caller, 'WARNING',  "WARNING: lisFile.getPrgFileListFromLisData returned no prg file");
        return {ok: true, data: {lisData, channelContentInfo, folders}};
    } else {
        logger.log(caller, 'WARNING',  'WARNING: update_screen: No screen_details information provided by server');
        return {ok: true};
    }
}
getPlaylistIdentifierListFromPrgFile = async (prgFile, mediaLibrary) => {
	var caller = 'getPlaylistIdentifierListFromPrgFile';
    var channelFilePath = mediaLibrary + '/' + prgFile;
    try {
        const readFile = util.promisify(fs.readFile);
        var data = await readFile(channelFilePath);
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: readFile failed');
        logger.error(caller, error);
        return {ok: false};
    }
    logger.log(caller, 'DEBUG', 'Channel file read: ' + channelFilePath);
    var dataHex = data.toString('hex').toUpperCase();
    logger.log(caller, 'DEBUG', 'Data: ' + dataHex);
    var playlistIdentifierList = [];
    for(let id=0; id<PRG_FEED_IDENTIFIER.length; id++) {
        const { type, typeHexa, length, offset } = PRG_FEED_IDENTIFIER[id];
        var bufX = 0;
        while (bufX < dataHex.length) {
            var index = 0;
            while((index<typeHexa.length) && (dataHex[bufX + index] == typeHexa[index])) {
                //logger.log(caller, 'DEBUG', 'Data match: ' + dataHex[bufX + index]);
                index ++;
            }
            if(index == typeHexa.length) {
                //logger.log(caller, 'DEBUG', 'playlist found for bufX = ' + bufX);
                var startIndex = bufX - offset;
                var endIndex = startIndex + length;
                var identifierHexaStr = '';
                for(let i=startIndex; i<endIndex; i++)
                    identifierHexaStr += dataHex[i];
                logger.log(caller, 'DEBUG',  'playlist identifier: ' + identifierHexaStr);
                var buffer = Buffer.from(identifierHexaStr, 'hex');
                playlistIdentifierList.push({type: type, id: buffer.toString()});
            } else {
                //logger.log(caller, 'DEBUG', 'Not match. next bufX: ' + bufX + ', next data: ' + dataHex[bufX]);
            }
            bufX += index + 1;
        }
    }
    for(let id=0; id<playlistIdentifierList.length; id++)
        logger.log(caller, 'INFO1', 'Playlist identifier found. Id: ' + playlistIdentifierList[id].id);
	return {ok: true, data: playlistIdentifierList};
}
ChannelContentInfo = (cmd, screenDetails) => {
    var caller = 'ChannelContentInfo';
    logger.log(caller, 'DEBUG', 'screenDetails: ' + JSON.stringify(screenDetails));
    const type =  'channel';
    const { screen_id, name, baseurl, path, file, version} = screenDetails;
	var filePathTable = file.split('\\');
	var endPath = '';
	for(var i=0; i<filePathTable.length; i++) {
		logger.log(caller, 'DEBUG', 'File[' + i + ']: ' + filePathTable[i]);
		if(i > 0)
			endPath += '/' + filePathTable[i];
	}
	const lisFilePath = path + endPath;
	const fullPath = baseurl + lisFilePath;
    logger.log(caller, 'INFO2', 'lis fullPath: ' + fullPath);
    return {cmd, type, id: screen_id, name, baseurl, path, file, version, lisFilePath, fullPath}
}