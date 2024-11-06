const App = require('../src/app/App');
const Player = require('../src/player/Player');
const Logger = require('../src/logging/logger');
const logger = new Logger(__filename, 'SoftPlayer');
/*--------------------------------------------------------------------------------------------
		SoftPlayer
---------------------------------------------------------------------------------------------*/
class SoftPlayer extends App {
	constructor(data, proxy) {
        super(data, proxy);
		this.players = [];
		this.playerConfigList = [];
    }
	//Start service
	async start() {
		const caller = 'start';
		const startPlayer = async(id) => {
			const caller = 'startPlayer';
			//Create new instance of player
			const server = {apiUrl : this.serverData.apiUrl, apiPort: this.serverData.apiPort};
			const player = new Player(server, this.playerConfigList[id]);
			this.players.push(player);
			//Start new player
			try {
				const result = await player.start();
				if(!result.ok) {
					logger.log(caller, 'INFO2', 'ERROR: player.start result is ko');
					return{ok: false};
				} else
					logger.log(caller, 'INFO0', 'Player started: ' + this.playerConfigList[id].computername);
			} catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: player.start failed');
                logger.error(caller, error);
                return{ok: false};
			}
			try {
				//Wait a while before starting the next player
				if(++id < this.playerConfigList.length)
					this.playerStartTimer = setTimeout(async() => await startPlayer(id), this.config.startTimerMs);
				return {ok: true};
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: setTimeout startPlayer failed');
                logger.error(caller, error);
                return{ok: false};
			}
		}
		//Clear players list
		this.players = [];
		this.playerConfigList = [];
		if(this.config.singlePlayer)
			//If only a single player to create do not use template but singlePlayerData config info
			this.playerConfigList.push(this.config.singlePlayerData);
		else {
			//Create as many players as specified in config file
			for(let id=0; id<this.config.nbPlayer; id++) {
				//Use template to create the players
				const config = {
					organization: this.config.playerTemplate.organization,
					ip: this.config.playerTemplate.ip.replace('X', id),
					computername: this.config.playerTemplate.computername.replace('X', id),
					macaddress: this.config.playerTemplate.macaddress.replace('X', id),
					codekey: this.config.playerTemplate.codekey.replace('X', id),
					version: this.config.playerTemplate.version
				}
				//Push player config
				this.playerConfigList.push(config);
			}
		}
		try {
			const result = await startPlayer(0, this.playerConfigList);
			if(!result.ok) {
				logger.log(caller, 'INFO2', 'ERROR: startPlayer result is ko');
				this.stop();
			}
			return result;
		} catch(error) {
			logger.log(caller, 'ERROR', 'ERROR: setTimeout startPlayer failed');
			logger.error(caller, error);
			this.stop();
			return{ok: false};
		}
	};
	//End service
	async stop() {
		var caller = 'stop';
		for(let id=0; id<this.players.length; id++)
			this.players[id].stop();
		return {ok: true};
	}
}
module.exports = SoftPlayer;