const User = require('./user');
const Service = require('./service');
const AgentRepository = require('../repository/agent');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'Agent');

const proxy = Service.getProxy();
if(!proxy) logger.log('Agent', 'ERROR', 'ERROR: proxy is undefined');

exports.getAgents = async(userId) => {
    const caller = 'getAgents';
    try {
        const userProps = await User.getUserProps(userId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanGetAgents = userProps.canGetAgents;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanGetAgents) {
        const errorMsg = 'Forbidden action. User is not allowed to get agent list. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
	try {
        const result = await AgentRepository.getAgents();
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: AgentRepository.getAgents result is ko.');
            return {ok: false};
        }
        //Add live status from Proxy about this agent
        const agents = result.data.map(agent => {
            return {
                ...agent,
                isRegistered: proxy.isRegistered(agent.hostName),
                isHeartbeatOk: proxy.isHeartbeatOk(agent.hostName),
                isStarted: proxy.isStarted(agent.hostName),
                connections: proxy.getConnections(agent.hostName),
                status: proxy.getStatus(agent.hostName),
                mustUpdate: proxy.getMustUpdate(agent.hostName)
            }
        });
		return{ok: true, data: agents};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AgentRepository.getAgents failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
}
exports.getAgent = async(userId, agentId) => {
    const caller = 'getAgent';
    try {
        const userProps = await User.getUserProps(userId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanGetAgents = userProps.canGetAgents;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanGetAgents) {
        const errorMsg = 'Forbidden action. User is not allowed to get agent list. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
    //Get agent from repository
	try {
        const result = await AgentRepository.getAgent(agentId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: AgentRepository.getAgent result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing AgentRepository'}};
        }
        if(result.data) {
            const hostName = result.data.hostName;
            logger.log(caller, 'INFO2', 'Agent found: ' + hostName);
            //Complete with live status from proxy
            const agent = {
                ...result.data,
                isRegistered: proxy.isRegistered(hostName),
                isHeartbeatOk: proxy.isHeartbeatOk(hostName),
                isStarted: proxy.isStarted(hostName),
                connections: proxy.getConnections(hostName),
                status: proxy.getStatus(hostName),
                mustUpdate: proxy.getMustUpdate(hostName)
            }
            return {ok: true, data: agent};
        } else {
            logger.log(caller, 'ERROR', 'ERROR: agent not found for id: ' + agentId);
            return {ok: false};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AgentRepository.getAgent failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
}
exports.saveNewAgent = async(userId, agentData) => {
    const caller = 'saveNewAgent';
	//Get user properties
    try {
        const userProps = await User.getUserProps(userId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanCreateAgent = userProps.canCreateAgent;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanCreateAgent) {
        const errorMsg = 'Forbidden action. User is not allowed to create any agent. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
    const creationDate = new Date().getTime();
    const lastModificationDate = creationDate;
    //Create new agent
    const agentDataToSave = {...agentData, creationDate, lastModificationDate};
    try {
        const result = await AgentRepository.saveAgent(agentDataToSave);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: AgentRepository.saveAgent result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing AgentRepository'}};
        }
        logger.log(caller, 'INFO0', 'Agent saved: ' + agentDataToSave.name);
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AgentRepository.saveAgent failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    return {ok: true};
}
exports.updateAgent = async(userId, agentId, agentData) => {
	const caller ='updateAgent';
	//Get user rights
    try {
        const userProps = await User.getUserProps(userId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanModifyAgent = userProps.canModifyAgent;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanModifyAgent) {
        const errorMsg = 'Forbidden action. User is not allowed to modify agent. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
	const agentDataToSave = {...agentData};
	//Update agent in repository
	try {
        const result = await AgentRepository.updateAgent(agentId, agentDataToSave);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: AgentRepository.updateAgent result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing AgentRepository'}};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AgentRepository.updateAgent failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
	logger.log(caller, 'INFO0', 'Agent updated: ' + agentDataToSave.hostName);
    return {ok: true};
}
exports.deleteAgent = async(userId, agentId) => {
	const caller = 'deleteAgent';
	//Get user rights
    try {
        const userProps = await User.getUserProps(userId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanDeleteAgent = userProps.canDeleteAgent;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanDeleteAgent) {
        const errorMsg = 'Forbidden action. User is not allowed to delete agent. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
	//Delete the agent from repository
    try {
        const result = await AgentRepository.deleteAgent(agentId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: AgentRepository.deleteAgent result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing AgentRepository'}};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AgentRepository.deleteAgent failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
	logger.log(caller, 'INFO0', 'Agent deleted');
    return {ok: true};
}
exports.sendCoreAgentCommand = async(userId, agentId, cmd) => {
	const caller = 'sendCoreAgentCommand';
	//Get user rights
    try {
        const userProps = await User.getUserProps(userId);
        if(!userProps) {
            const errorMsg = 'userProps is undefined. userId: ' + userId;
            logger.log(caller, 'ERROR', 'ERROR User.getUserProps failed: ' + errorMsg);
            return {ok: false, error: {status: 'DATABASE', msg: errorMsg}};
        }
        var userCanSetAgent = userProps.canSetAgent;
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: getUserProps failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
    if(!userCanSetAgent) {
        const errorMsg = 'Forbidden action. User is not allowed to send cmd to remote agent. userId: ' + userId;
        logger.log(caller, 'ERROR', 'ERROR: ' + errorMsg);
        return {ok: false, error: {status: 'NOT_ALLOWED', msg: errorMsg}};
    }
    //Get agent hostName from repository
	try {
        const result = await AgentRepository.getAgent(agentId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: AgentRepository.getAgent result is ko.');
            return {ok: false, error: {status: 'DATABASE', msg: 'Error when accessing AgentRepository'}};
        }
        if(result.data) {
            const hostName = result.data.hostName;
            logger.log(caller, 'INFO2', 'Agent found: ' + hostName);
            //Inform the Proxy about the status change request
            try {
                const result = await proxy.sendCoreAgentCmd({ hostName: hostName, cmd: cmd });
                if(!result.ok)
                    logger.log(caller, 'ERROR', 'ERROR: proxy.sendCoreAgentCmd result is ko');
                return {ok: true};
            } catch(error) {
                logger.log(caller, 'ERROR', 'ERROR: proxy.sendCoreAgentCmd failed');
                logger.error(caller, error);
                return {ok: false};
            }
        } else {
            logger.log(caller, 'ERROR', 'ERROR: agent not found for id: ' + agentId);
            return {ok: false};
        }
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AgentRepository.getAgent failed');
        logger.error(caller, error);
        return {ok: false, error: {status: 'FATAL', msg: 'Exception catched. Check errors in logs'}};
    }
}