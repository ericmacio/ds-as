const fsp = require('fs').promises;
const Logger = require('../logging/logger');
const register = require('./register');
const configuration = require('./configuration');
const broadcastInformation = require('./broadcastInformation');
const loopDuration = require('./loopDuration');
const keepAlive = require('./keepAlive');
const quickMessage = require('./quickMessage');
const channel = require('./channel');
const broadcastContent = require('./broadcastContent');
const logger = new Logger(__filename, 'Player');
const playerConfig = require('./Player.json');
/*--------------------------------------------------------------------------------------------
		Player
---------------------------------------------------------------------------------------------*/
class Player {
    constructor(server, configValues) {
        var caller = 'Player';
        this.server = {host: server.apiUrl, port: server.apiPort};
        this.sendTimer = playerConfig.sendTimer;
        this.name = configValues.computername;
        logger.log(caller, 'INFO2', 'Player name: ' + this.name);
        //Set config values
        this.configValues = {
            ...playerConfig.values,
            fqdn: configValues.computername + '.' + playerConfig.values.domainname,
            unique_id: configValues.computername,
            netbios: configValues.computername,
            port: playerConfig.values.http_port,
            mac_address: configValues.macaddress,
            ...configValues
        }
        this.mediaLibrary = {
            rootLibrary: playerConfig.playersDir + '/' + this.configValues.computername,
            channelLibrary: playerConfig.playersDir + '/' + this.configValues.computername + '/channel',
            playlistsLibrary: playerConfig.playersDir + '/' + this.configValues.computername + '/playlists',
        }
        this.qmListFile = this.mediaLibrary.rootLibrary + '/' + playerConfig.qmListFile;
        this.broadcastContentFile = this.mediaLibrary.rootLibrary + '/' + playerConfig.broadcastContentFile;
        this.playerId = '';
        this.qmList = [];
        this.startTime = '';
        this.broadcastContent = [];
        this.timerList = {};
    }
    //start
    async start() {
        const caller = 'start';
        //Create and cleanup player media library
        try {
            const result = await this.createMedialibrary();
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: createMedialibrary result is ko');
                return {ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: createMedialibrary failed');
            logger.error(caller, error);
            return {ok: false};
        }
        //Register the player
        try {
            const result = await register.sendRegister(this.server, this.configValues);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: register.sendRegister result is ko');
                this.stop();
                return {ok: false};
            }
            this.playerId = result.data.playerId,
            this.startTime = result.data.startTime
            logger.log(caller, 'INFO1', 'Player has been registered. Player id: ' + this.playerId + ', start time: ' + this.startTime);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: register.sendRegister failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        //Start sending configuration
        try {
            const result = await this.startSendConfiguration();
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: startSendConfiguration result is ko');
                this.stop();
                return {ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: startSendConfiguration failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        //Send keep alive message
        try {
            const result = await this.startSendKeepAlive('message');
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: startSendKeepAlive result is ko');
                this.stop();
                return {ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: startSendKeepAlive failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        //Start sending keep alive
        try {
            const result = await this.startSendKeepAlive('alive');
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: startSendKeepAlive result is ko');
                this.stop();
                return {ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: startSendKeepAlive failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        //Get current channel content
        try {
            const result = await channel.getContent(this.server, this.playerId, this.configValues, this.mediaLibrary);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: channel.getContent result is ko');
                this.stop();
                return {ok: false};
            }
            //Initialize broadcast content
            if(result.data && result.data.folders)
                this.broadcastContent = result.data.folders;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: channel.getContent failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        //Send new broadcast content if any
        if(this.broadcastContent.length > 0) {
            try {
                const result = await this.storeAndSendBroadcastContent();
                if(!result.ok) {
                    logger.log(caller, 'INFO2', 'ERROR: storeAndSendBroadcastContent result is ko');
                    this.stop();
                    return {ok: false};
                }
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: storeAndSendBroadcastContent failed');
                logger.error(caller, error);
                this.stop();
                return {ok: false};
            }
        }
        //Send broadcast information
        try {
            const result = await this.startSendBroadcastInformation();
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: startSendBroadcastInformation result is ko');
                this.stop();
                return {ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: startSendBroadcastInformation failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        //Send new loop duration
        try {
            const result = await this.startSendLoopDuration();
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: startSendLoopDuration result is ko');
                this.stop();
                return {ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: startSendLoopDuration failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        //Start sending quick message request
        try {
            const result = await this.startSendQuickMessage();
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: startSendQuickMessage result is ko');
                this.stop();
                return {ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: startSendQuickMessage failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        //End of processes start
        return {ok: true};
    }
    async createMedialibrary() {
        const caller = 'createMedialibrary';
        //Create players directories if they not exist yet
        try {
            await fsp.access(playerConfig.playersDir);
        } catch(error) {
            //Directory does not exists
            try {
                await fsp.mkdir(playerConfig.playersDir);
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: Cannot create playersDir directory: ' + error);
                return {ok: false};
            }
        }
        //Cleanup player root mediaLibrary
        try {
            //Check if current player root mediaLibrary exist
            await fsp.access(this.mediaLibrary.rootLibrary);
            //Exist. So Delete it
            try {
                await fsp.rmdir(this.mediaLibrary.rootLibrary, { recursive: true });
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: Cannot delete directory: ' + error);
                return {ok: false};
            }
        } catch(error) {
            //Directory does not exists
        } finally {
            //Create (or re-create) player root mediaLibrary
            try {
                await fsp.mkdir(this.mediaLibrary.rootLibrary);
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: Cannot create mediaLibrary.rootLibrary directory: ' + error);
                return {ok: false};
            }
        }
        //Create player channel and playlist directories
        try {
            await fsp.mkdir(this.mediaLibrary.channelLibrary);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: Cannot create mediaLibrary.channelLibrary directory: ' + error);
            return {ok: false};
        }
        try {
            await fsp.mkdir(this.mediaLibrary.playlistsLibrary);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: Cannot create mediaLibrary.playlistsLibrary directory: ' + error);
            return {ok: false};
        }
        return {ok: true};
    }
    async startSendConfiguration() {
        const caller = 'startSendConfiguration'
        try {
            const result = await configuration.send(this.server, this.playerId, this.configValues);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: configuration.send result is ko');
                this.stop();
                return {ok: false};
            }
            try {
                this.timerList.configuration = setTimeout(
                    async() => await this.startSendConfiguration()
                    , this.sendTimer.configuration
                );
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: setTimeout startSendConfiguration failed');
                logger.error(caller, error);
                this.stop();
                return{ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: configuration.send failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        return {ok: true};
    }
    async startSendKeepAlive(type) {
        const caller = 'startSendKeepAlive';
        try {
            const result = await keepAlive.send(this.server, type, this.playerId, this.startTime, this.configValues);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: keepAlive.send result is ko');
                this.stop();
                return {ok: false};
            }
            if(type == 'alive') {
                try {
                    this.timerList.keepAlive = setTimeout(
                        async() => await this.startSendKeepAlive(type)
                        , this.sendTimer.keepAlive
                    );
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: setTimeout startSendKeepAlive failed');
                    logger.error(caller, error);
                    this.stop();
                    return{ok: false};
                }
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: keepAlive.send failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        return {ok: true};
    }
    async startSendBroadcastInformation() {
        const caller = 'startSendBroadcastInformation';
        try {
            const result = await broadcastInformation.send(this.server, this.playerId);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: broadcastInformation.send result is ko');
                this.stop();
                return {ok: false};
            }
            try {
                this.timerList.broadcastInformation = setTimeout(
                    async() => await this.startSendBroadcastInformation()
                    , this.sendTimer.broadcastInformation
                );
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: setTimeout startSendBroadcastInformation failed');
                logger.error(caller, error);
                this.stop();
                return{ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: broadcastInformation.send failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        return {ok: true};
    }
    async startSendLoopDuration() {
        const caller = 'startSendLoopDuration';
        try {
            const result = await loopDuration.send(this.server, this.playerId);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: loopDuration.send result is ko');
                this.stop();
                return {ok: false};
            }
            try {
                this.timerList.loopDuration = setTimeout(
                    async() => {return await this.startSendLoopDuration()}
                    , this.sendTimer.loopDuration
                );
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: setTimeout startSendLoopDuration failed');
                logger.error(caller, error);
                this.stop();
                return{ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: loopDuration.send failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        return {ok: true};
    }
    async startSendQuickMessage() {
        const caller = 'startSendQuickMessage';
        try {
            const result = await quickMessage.send(this.server, this.playerId, this.configValues, this.mediaLibrary, this.setBroadcastContent.bind(this), this.storeQM.bind(this));
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: quickMessage.send result is ko');
                this.stop();
                return {ok: false};
            }
            try {
                this.timerList.quickMessage = setTimeout(
                    async() => {return await this.startSendQuickMessage()}
                    , this.sendTimer.quickMessage
                );
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: setTimeout startSendQuickMessage failed');
                logger.error(caller, error);
                this.stop();
                return{ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: quickMessage.send failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        return {ok: true};
    }
    async storeQM(qmData) {
        const caller = 'storeQM';
        var date = new Date().toLocaleString();
        try {
            const qm = '--- QM\ndate: ' + date 
            + '\ntype: ' + qmData.type 
            + '\nname: ' + qmData.name 
            + '\nid: ' + qmData.id + '\n';
            await fsp.appendFile(this.qmListFile, qm);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: Cannot write to qm list file: ' + error);
            return {ok: false};
        }
        return {ok: true};
    }
    async storeBroadcastContent() {
        const caller = 'storeBroadcastContent';
        var date = new Date().toLocaleString();
        var broadcastContent = '--------- Broadcast content ---------\ndate: ' + date + '\n';
        for(let id=0; id<this.broadcastContent.length; id++) {
            broadcastContent +=
            '--- type: ' + this.broadcastContent[id].type 
            + '\nname: ' + this.broadcastContent[id].name 
            + '\nid: ' + this.broadcastContent[id].id 
            + '\nversion: ' + this.broadcastContent[id].version + '\n';
        }
        try {
            await fsp.appendFile(this.broadcastContentFile, broadcastContent);
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: Cannot write to broadcastContent file: ' + error);
            return {ok: false};
        }
        return {ok: true};
    }
    async setBroadcastContent(newContent) {
        const caller = 'setBroadcastContent';
        //Update broadcast content
        //First check if this is a channel update content. Identify the channel element
        const channel = newContent.find(content => content.type == 'channel');
        if(channel) {
            //This is a channel update content
            logger.log(caller, 'INFO0', 'There is a channel');
            //Check if channel already exist
            var channelExist = this.broadcastContent.find(element => channel.id == element.id);
            if(!channelExist) {
                //This is new channel. We must clear the current content
                logger.log(caller, 'INFO0', 'Channel has been changed. Cleanup broadcast content');
                this.broadcastContent = [];
                //Delete existing playlist directories
                try {
                    await fsp.rmdir(this.mediaLibrary.playlistsLibrary, { recursive: true });
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: Cannot delete directory: ' + error);
                    return {ok: false};
                }
                //And create it again
                try {
                    await fsp.mkdir(this.mediaLibrary.playlistsLibrary);
                } catch(error) {
                    logger.log(caller, 'ERROR', 'ERROR: Cannot create mediaLibrary.playlistsLibrary directory: ' + error);
                    return {ok: false};
                }
            } else {
                //Remove old element from broadcast content
                const newBroadCastContent = this.broadcastContent.filter((element) => newContent.find(content => content.id == element.id));
                this.broadcastContent = [...newBroadCastContent];
            }
        }
        //Now update the broadcast content with the new content
        for(let id=0; id<newContent.length; id++) {
            var found = false;
            for(let i=0; i<this.broadcastContent.length; i++) {
                if(this.broadcastContent[i].id == newContent[id].id) {
                    found = true;
                    //Update folder version only if not null to keep current value. This will be the case for a channel update (update_screen QM)
                    if(newContent[id].version != 0)
                        this.broadcastContent[i].version = newContent[id].version;
                    if(!this.broadcastContent[i].name)
                        this.broadcastContent[i].name = newContent[id].name;
                }
            }
            if(!found) {
                //This folder does not exist yet. Add it to the list
                logger.log(caller, 'INFO0', 'New ' + newContent[id].type + ': name: ' + newContent[id].name + ', id: ' + newContent[id].id);
                this.broadcastContent.push(newContent[id]);
            }
        }
        //Now send new broadcast content
        try {
            const result = await this.storeAndSendBroadcastContent();
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: storeAndSendBroadcastContent result is ko');
                return {ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: storeAndSendBroadcastContent failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        return {ok: true};
    }
    async storeAndSendBroadcastContent() {
        const caller = 'storeAndSendBroadcastContent';
        //Store broadcast content
        try {
            const result = await this.storeBroadcastContent();
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: storeBroadcastContent result is ko');
                this.stop();
                return {ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: storeBroadcastContent failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        //Send broadcast content
        try {
            const result = await broadcastContent.send(this.server, this.playerId, this.configValues, this.broadcastContent);
            if(!result.ok) {
                logger.log(caller, 'INFO2', 'ERROR: broadcastContent.send result is ko');
                this.stop();
                return {ok: false};
            }
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: broadcastContent.send failed');
            logger.error(caller, error);
            this.stop();
            return {ok: false};
        }
        return {ok: true};
    }
    //stop
    stop() {
        const caller = 'stop';
        for(let key in this.timerList)
            clearTimeout(this.timerList[key]);
        logger.log(caller, 'INFO0', 'Processes have been stopped for player ' + this.name);
    }
}
module.exports = Player;