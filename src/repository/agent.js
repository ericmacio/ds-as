const AgentDb = require('./models/agent');
const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'AgentsRepository');

exports.getAgents = async () => {
    const caller = 'getAgents';
    try {
		const agentsDb = await AgentDb.find();
        const agents = agentsDb.map(agentDb => {return setAgent(agentDb);});
        return {ok: true, data: agents}
	} catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AgentDb.find failed');
        logger.error(caller, error);
		return {ok: false};
	}
}
exports.saveAgent = async(agentData) => {
    const caller = 'saveAgent';
    const agentDb = new AgentDb(agentData);
    //Save new service into database
    try {
        await agentDb.save();
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: agentDb.save failed');
        logger.error(caller, error);
        return {ok: false};
    }
    return {ok: true};
}
exports.getAgent = async(agentId) => {
    const caller = 'getAgent';
    //Get agent from database
    try {
        const agentDbData = await AgentDb.findById(agentId);
        const agentData = setAgent(agentDbData);
        return {ok: true, data: agentData};
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AgentDb.findById failed');
        logger.error(caller, error);
        return {ok: false};
    }
}
exports.deleteAgent = async(agentId) => {
    const caller = 'deleteAgent';
    //Delete agent from database
    try {
        await AgentDb.findByIdAndDelete(agentId);
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AgentDb.findByIdAndDelete failed');
        logger.error(caller, error);
        return {ok: false}
    }
    return {ok: true};
}
exports.updateAgent = async(agentId, agentData) => {
    const caller = 'updateAgent';
    //Update agent in database
    try {
        await AgentDb.updateOne({_id: agentId}, {...agentData});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: AgentDb.updateOne failed');
        logger.error(caller, error);
        return {ok: false}
    }
    return {ok: true};
}
setAgent = (agentDbData) => {
    const caller = 'setAgent';
    const agent = {
        id: agentDbData._id.toString(),
        hostName: agentDbData.hostName,
        registrationTime: agentDbData.registrationTime,
        lastRegistrationTime: agentDbData.lastRegistrationTime,
        expires: agentDbData.expires,
        lastHeartbeatTime: agentDbData.lastHeartbeatTime,
        network: agentDbData.network ? JSON.parse(agentDbData.network) : {},
        coreVersion: agentDbData.coreVersion,
        agentVersion: agentDbData.agentVersion
    };
    return agent;
}