const App = require('../src/app/App');
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'CreatePlaylist');
/*--------------------------------------------------------------------------------------------
		CreatePlaylist
---------------------------------------------------------------------------------------------*/
class CreatePlaylist extends App {
    constructor(data, proxy) {
        super(data, proxy);
        this.playlistCreated = false;
    }
    async start() {
        const caller = 'start';
        try {
			let result = await this.api.playlist.create({name: this.config.playlist});
			if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: api.playlist.create result is ko');
                logger.log(caller, 'ERROR', 'ERROR: Playlist cannot be created');
                this.notifyStatus('error');
            } else {
                this.playlistCreated = true;
                logger.log(caller, 'INFO0', 'Playlist created: ' + this.config.playlist);
            }
            return result;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: api.playlist.create failed');
            return {ok: false};
        }
    }
    async stop() {
        const caller = 'stop';
        if(this.playlistCreated) {
            try {
                var result = await this.api.playlist.delete({name: this.config.playlist});
                if(!result.ok) {
                    logger.log(caller, 'DEBUG', 'ERROR: api.playlist.delete result is ko');
                    logger.log(caller, 'ERROR', 'ERROR: Playlist cannot be deleted');
                    this.notifyStatus('error');
                } else
                    logger.log(caller, 'INFO0', 'Playlist deleted: ' + this.config.playlist);
                return result;
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: api.playlist.delete failed');
                return {ok: false};
            }
        } else
            return {ok: true};
    }
}
module.exports = CreatePlaylist;