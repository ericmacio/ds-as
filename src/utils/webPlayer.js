var express = require('express');
var fs = require('fs');
var webSocketServer = require('ws').Server;
var Logger = require('../logging/logger');
var logger = new Logger(__filename, 'webPlayer');
var MEDIA_DIR = '../../players/medias/';
var REMOTE_MEDIA_DIR = '../../players/medias/';
var LOCAL_MEDIA_DIR = '../../players/medias/';
var CHANNEL_DIR = './appsData/WebPlayer/players/';
var JAVASCRIPT_PATH = '../../javascript/';
var JAVASCRIPT_SRC_TABLE = ['jquery-2.1.1.js', 'serverCom.js', 'createCSS.js', 'createDOM.js', 'fileSystem.js', 'requestMgr.js', 'channel.js', 'builder.js', 'player.js'];
var TEMPLATE = {"channel":{"name":"Template","keepalive_frequency":"0","version":"0","body_list":[{"name":"body1","version":"0","body_layout":{"display":{"background_color":"black","position":"fixed","margin":"0px","width":"100%","height":"100%"}},"diff_area_list":[{"display":{"position":"absolute","top":"0%","left":"0%","width":"100%","height":"100%","zindex":"3"},"layout_list":[{"name":"layout","playlist":{"name":"playlist","media_list":[{"type":"image","src":"images/bg.jpg","duration":"0","display":{"position":"absolute","width":"100%","zindex":"0"}}]}}],"program":{"playlist_list":[{"name":"images","layout":"layout","version":"0","media_list":[]}]}}]}]}}
var CHANNEL_PREFIX = 'tmp_';
var clientTable = [];
/*--------------------------------------------------------------------------------------------
		WebPlayer
---------------------------------------------------------------------------------------------*/
class WebPlayer {
    constructor(port) {
        var caller = 'WebPlayer';
        this.port = port;
        this.socketPort = port + 1;
    }
    createChannel(name, callback) {
        var caller = 'createChannel';
        var channelName = CHANNEL_PREFIX + name;
        var channelPath = CHANNEL_DIR + channelName + '.json';
        var channelUrl = 'http://localhost:' + this.port + '/apps/webPlayer/' + channelName;
        fs.access(channelPath, (error) => {
            if(!error) {
                logger.log(caller, 'ERROR', 'ERROR: channel already exist: ' + channelPath);
                var err = {msg: 'Channel already exist. Name: ' + name};
                return callback(err);
            }
            fs.writeFile(channelPath, JSON.stringify(TEMPLATE), (error) => {
                if(error) {
                    logger.log(caller, 'ERROR', 'ERROR: fs.writeFile failed');
                    var err = {msg: 'cannot write channel data. Path: ' + channelPath};
                }
                callback(err, TEMPLATE, channelUrl);
            })
        });
    }
    updateChannel(name, channelData, callback) {
        var caller = 'updateChannel';
        var channelPath = CHANNEL_DIR + CHANNEL_PREFIX + name + '.json';
        fs.writeFile(channelPath, JSON.stringify(channelData), (error) => {
            if(error) {
                logger.log(caller, 'ERROR', 'ERROR: fs.writeFile failed: ' + error);
                var err = {msg: 'cannot update channel data. Path: ' + channelPath};
            }
            callback(err);
        })
    }
    deleteChannel(name, callback) {
        var caller = 'deleteChannel';
        var channelPath = CHANNEL_DIR + CHANNEL_PREFIX + name + '.json';
        fs.unlink(channelPath,(error) => {
            if(error) {
                logger.log(caller, 'ERROR', 'ERROR: fs.unlink failed: ' + error);
                var err = {msg: 'cannot delete channel file. Path: ' + channelPath};
            }
            callback(err);
        })
    }
    start() {
        var caller = 'start';
        this.startRouter();
        this.socketServer();
    }
    stop(connection, clientId, playerId) {
        var caller = "socketClient";
        logger.log(caller, 'INFO2', 'Stop web player');
        clientTable = [];
        this.app.close();
        this.wsServer.close();
    }
    notify(msg) {
        var caller = 'notify';
        logger.log(caller, 'INFO1', 'Notification received from: ' + msg.src + ', cmd: ' + msg.cmd + ', player id: ' + msg.playerId);
        logger.log(caller, 'INFO2', JSON.stringify(msg));
        logger.log(caller, 'DEBUG', 'mediaList length: ' + msg.mediaList.length);
        var found = false;
        for(var id=0; id<clientTable.length; id++) {
            if(clientTable[id].playerId == msg.playerId) {
                //id may be different from clientId if some client have been disconnected
                logger.log(this.caller, 'INFO1', 'Notify clientId: ' + clientTable[id].clientId);
                clientTable[id].connection.send(JSON.stringify(msg));
                found = true;
            }
        }
        if(!found)
            logger.log(caller, 'ERROR', 'ERROR: No socket connection found for: ' + msg.playerId)
    }
    startRouter() {
        var caller = 'startRouter';
        //Create a router
        var router = express.Router();
        //Setup the collection routes
        router.route('/config/:channel')
            .get(function(req, res, next) {
                var channel = req.params['channel'];
                logger.log(caller, 'DEBUG', 'Channel: ' + channel);
                var config = {
                    playerId: 'AS webPlayer',
                    mediaDir: MEDIA_DIR,
                    remoteMediaDir: REMOTE_MEDIA_DIR,
                    localMediaDir: LOCAL_MEDIA_DIR,
                    javascriptSrcTable: JAVASCRIPT_SRC_TABLE
                }
                res.status(200).send(config);
            })
            .all(function(req, res, next) {
                res.status(501).send({status: 'Not implemented'});
            });
        router.route('/channel/:name')
            .get(function(req, res, next) {
                var channel = req.params['name'];
                var channelDataFile = CHANNEL_DIR + channel + '.json';
                logger.log(caller, 'DEBUG', 'channelDataFile: ' + channelDataFile);
                fs.readFile(channelDataFile, (error, channelData) => {
                    if(error) {
                        logger.log(caller, 'ERROR', "ERROR: Can't read file: " + channelDataFile + ", error: " + error);
                        res.status(404).send('Not found: ' + channelDataFile);
                     } else {
                        logger.log(caller, 'DEBUG', "Read data from file " + channelDataFile);
                        res.set('Content-Type', 'application/json');
                        res.status(200).send(channelData);
                     }
                });
            })
            .all(function(req, res, next) {
                res.status(501).send({status: 'Not implemented'});
            });
        router.route('/alive/:playerId')
            .get(function(req, res, next) {
                res.status(501).send({status: 'Not implemented'});
            })
            .put(function(req, res, next) {
                var playerId = req.params['playerId'];
                logger.log(caller, 'DEBUG', "Received keep-alive from " + playerId);
                res.status(200).send({status: 'OK'});
            })
            .all(function(req, res, next) {
                res.status(501).send({status: 'Not implemented'});
            });
        router.route('/favicon.ico')
            .get(function(req, res, next) {
                fs.createReadStream('./favicon.ico').pipe(res);
            });
        router.route('/:playerId')
            .get(function(req, res, next) {
                var channel = req.params['playerId'];
                var startHtml = './appsData/webPlayer/start.html';
                var startHtml = '<!DOCTYPE html><html><head><title>Web player - ' + channel + '</title>';
                for(var id=0; id<JAVASCRIPT_SRC_TABLE.length; id++)
                    startHtml += '<script type=text/javascript src=' + JAVASCRIPT_PATH + JAVASCRIPT_SRC_TABLE[id] + '></script>';
                startHtml += '</head><body player=' + channel + ' mode=online></body></html>';
                res.set('Content-Type', 'text/html');
                res.status(200).send(startHtml);
            })
            .all(function(req, res, next) {
                res.status(501).send({URL: 'Not implemented'});
            });
        router.route('/*')
            .all(function(req, res, next) {
                logger.log(caller, 'INFO1', '* all. req URL: ' + req.url);
                res.status(403).send({status: 'Forbidden !'});
            });
        //Use the router
        this.app = express()
                    .use(express.static('./appsData/webPlayer'))
                    .use('/apps/webPlayer', router)
                    .listen(this.port);
        logger.log(caller, 'DEBUG', '__dirname: ' + __dirname);
        logger.log(caller, 'INFO1', 'Web server has been started on port ' + this.port);
    }
    socketServer() {
        //Create web socket server
        var caller = "socketServer";
        this.wsServer = new webSocketServer({port: this.socketPort});
        logger.log(caller, 'INFO1', 'Web socket server has been started on port ' + this.socketPort);
        //Event: webSocket client connection
        this.wsServer.on('connection', (connection) => {
                logger.log(caller, 'INFO2', "New Websocket connection accepted.");
                connection.on('message', (message) => {
                    try {
                        var msg = JSON.parse(message);
                        logger.log(caller, 'INFO2', "Received Message: " + msg.cmd);
                        switch(msg.cmd) {
                            case "Hello":
                                var clientId = clientTable.length;
                                connection.clientId = clientId;
                                connection.playerId = msg.playerId;
                                var newClient = new socketClient(connection, clientId, msg.playerId);
                                clientTable[clientId] = newClient;
                                var date = new Date();
                                var msec = date.getMilliseconds();
                                if(msec<10) msec = "0" + msec;
                                var response = {
                                    cmd: 'HelloResponse',
                                    clientId: clientId,
                                    date: date.toLocaleString() + ":" + msec
                                }
                                //Send Hello response message to the ws client
                                connection.send(JSON.stringify(response));
                                logger.log(caller, 'INFO1', 'Connected to websocket server. Client id: ' + clientId + ', player id: ' + msg.playerId);
                                break;
                            default:
                                logger.log(caller, 'WARNING', "Undefined msg type: " + msg.cmd);
                                break;
                        }
                    } catch(error) {
                        logger.log(caller, 'ERROR', "ERROR: cannot parse JSON data from server: " + error);
                    }		
                });
                connection.on('close', () => {
                        //clientTable id may be different from clientId if some client have already been disconnected
                        for(var id=0 ;id<clientTable.length; id++)
                            if(clientTable[id].clientId == connection.clientId)
                                //Remove client from table
                                clientTable.splice(id,1);
                        logger.log(caller, 'INFO1', 'Connection closed. Player id: ' + connection.playerId + ', clientId: ' + connection.clientId);
                        //var msg = "Log client disconnected: " + clientId;
                        //Do not send message as others still active connections may be in the process of closing as well
                        //logSystem(caller, GLOB_LOG_INFO1, msg);
                    }
                );
            }
        );
    }
}
class socketClient {
    constructor(connection, clientId, playerId) {
        var caller = "socketClient";
        this.connection = connection;
        this.clientId = clientId;
        this.playerId = playerId;
        this.active = true;
        logger.log(caller, 'INFO2', "New client. id: " + this.clientId, ', playerId: ' + this.playerId);
    }
}
module.exports = WebPlayer;