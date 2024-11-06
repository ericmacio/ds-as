const fsp = require('fs').promises;
const api = require('./api');
const medias = require('./medias');
const lisFile = require('./lisFile');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'folder');
const MSG_3213 = '3213';

exports.getContent = async(server, playerId, folderId, mediaLibrary) => {
    const caller = 'getContent';
    try {
        const result = await getPlaylistOrFeedToBroadcast(server, playerId, folderId);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: getPlaylistOrFeedToBroadcast result is ko');
            return {ok: false};
        }
        var playlistInfo = result.data;
    }
    catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getPlaylistOrFeedToBroadcast failed');
        logger.error(caller, error);
        return {ok: false};
    }
    if(playlistInfo.status == 'ok') {
        var mediaFeedUpdate = playlistInfo.mediaFeedUpdate;
        //Create folderContentInfo from server data
        var folderContentInfo = FolderContentInfo('getPlaylistOrFeedToBroadcast', mediaFeedUpdate);
        //Create or clean according playlist directory
        const playlistLibrary = mediaLibrary.playlistsLibrary + '/' + folderContentInfo.name;
        var alreadyExists = true;
        try {
            //Check if exists
            await fsp.access(playlistLibrary);
            //Directory already exists. So clean it from previous content
            try {
                const result = await medias.clearContent(playlistLibrary);
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
        } catch(error) {
            //Directory does not exists. Create it then
            try {
                await fsp.mkdir(playlistLibrary);
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: Cannot create playersDir directory: ' + error);
                return {ok: false};
            }
        }
        //Get lis file information for this playlist
        try {
            const result = await lisFile.getLisFileInfo(folderContentInfo, playlistLibrary);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: listFile.getLisFileInfo result is ko');
                return {ok: false};
            }
            //Store lis data
            var lisData = result.data;
        }
        catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: listFile.getLisFileInfo failed');
            logger.error(caller, error);
            return {ok: false};
        }
        try {
            const result = await medias.getAllMediasFromServer(lisData.lisFileList, playlistLibrary);
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
    } else
        logger.log(caller, 'WARNING', 'WARNING: playlistInfo status is ko. Message: ' + playlistInfo.message);
    return {ok: true, data: {lisData, folderContentInfo, folders: [{type: 'playlist', id: folderId, name: folderContentInfo.name, version: folderContentInfo.version}]}};
}
getPlaylistOrFeedToBroadcast = async(server, playerId, folderId) => {
    var caller = 'getPlaylistOrFeedToBroadcast';
    logger.log(caller, 'DEBUG', 'Request playlist info for identifier: ' + folderId);
    let urlPath = '/' + playerId + '?device_type=win&folder_identifier=' + folderId;
    try {
        var result = await api.executeCmd(server.host, server.port, 'getPlaylistOrFeedToBroadcast', urlPath, null);
        if(!result.ok) {
            logger.log(caller, 'INFO2', 'ERROR: api.executeCmd result is ko');
            logger.log(caller, 'ERROR', 'ERROR. QM processing aborted: ' + qmName);
            return {ok: false};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: api.executeCmd failed');
        logger.error(caller, error);
        return {ok: false};
    }
    const qmResult = result.data;
    logger.log(caller, 'DEBUG', 'playlist xml ' + JSON.stringify(qmResult));
    var message = qmResult['server_response']['$']['message'];
    if(message == MSG_3213) {
        logger.log(caller, 'WARNING', 'WARNING: error 3213. Playlist access refused. Identifier: ' + folderId);
        var playlistInfo = {
            status: 'ko',
            message: message
        }
    } else {
        var mediaFeedUpdate =  qmResult['server_response']['media_feed_update'][0]['media_feed_update'][0]['$'];
         var playlistInfo = {
            status: 'ok',
            mediaFeedUpdate: mediaFeedUpdate
        }
    }
    return {ok: true, data: playlistInfo};
}
FolderContentInfo = (cmd, mediaFeedInfo) => {
    var caller = 'FolderContentInfo';
    logger.log(caller, 'DEBUG', 'mediaFeedInfo: ' + JSON.stringify(mediaFeedInfo));
    const type =  'folder';
    const { feed_id, name, baseurl, path, file, revision } = mediaFeedInfo;
	const lisFilePath = path + '/' + file;
	logger.log(caller, 'DEBUG', 'lis lisFilePath: ' + lisFilePath);
	const fullPath = baseurl + path + '/' + file;
    logger.log(caller, 'DEBUG', 'lis fullPath: ' + fullPath);
    return {cmd, type, id: feed_id, name, baseurl, path, file, version: revision, lisFilePath, fullPath};
}