const App = require('../src/app/App');
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'CreateChannel');
/*--------------------------------------------------------------------------------------------
		CreateChannel
---------------------------------------------------------------------------------------------*/
class CreateChannel extends App {
    constructor(data, proxy) {
        super(data, proxy);
        this.channelCreated = false;
    }
    async start() {
        const caller = 'start';
        try {
			let result = await this.api.channel.create({name: this.config.channel});
			if(!result.ok) {
                logger.log(caller, 'DEBUG', 'ERROR: api.channel.create result is ko');
                logger.log(caller, 'ERROR', 'ERROR: Channel cannot be created');
            } else {
                this.channelCreated = true;
                logger.log(caller, 'INFO0', 'Channel created: ' + this.config.channel);
                logger.log(caller, 'INFO0', 'NEW TEST APP 0');
            }
            return result;
        } catch(error) {
            logger.log(caller, 'ERROR', 'ERROR: api.channel.create failed');
            logger.error(caller, error);
            return {ok: false};
        }
        
    }
    async stop() {
        const caller = 'stop';
        if(this.channelCreated) {
            try {
                var result = await this.api.channel.delete({name: this.config.channel});
                if(!result.ok) {
                    logger.log(caller, 'DEBUG', 'ERROR: api.channel.delete result is ko');
                    logger.log(caller, 'ERROR', 'ERROR: Channel cannot be deleted');
                } else
                    logger.log(caller, 'INFO0', 'Channel deleted: ' + this.config.channel);
                return result;
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: api.channel.delete failed');
                return {ok: false};
            }
        } else
            return {ok: true};
    }
}
module.exports = CreateChannel;