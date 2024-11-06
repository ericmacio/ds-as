const Agent = require('../../domain/agent');
const { errorCode } = require('./controllers.json');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'agentsController');

exports.getAgents = async(req, res, next) => {
    const caller = 'getAgents';
    const userId = req.userId;
    //Get the list of agents
    try {
        const result = await Agent.getAgents(userId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: Agent.getAgents result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot get agents'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot get agents'}});
            return;
        }
        const agents = result.data;
        res.status(200).send({ok: true, error: null, data: agents});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Agent.getAgents failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot get agents list. Error: ' + error}});
    }
}
exports.postAgent  = async (req, res, next) => {
    const caller = 'postAgent';
    //Get userId from request
    const userId = req.userId;
    //Get agent data from request body data
    const agentData = req.body;
    //Save new agent
    try {
        const result = await Agent.saveNewAgent(userId, agentData);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: Agent.saveNewAgent result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot save agents'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot save agents'}});
            return;
        } else
            res.status(200).send({ok: true, error: null, data: 'Agent created'});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Agent.saveNewAgent failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot save new agent'}});
        return;
    }
}
exports.putAgent  = async (req, res, next) => {
    const caller = 'putAgent';
    //Get userId from request
    const userId = req.userId;
    //Modify an existing agent
    const agentId = req.params['id'];
    //Get agent data from request body
    const agentData = req.body;
    //Update service
    try {
        const result = await Agent.updateAgent(userId, agentId, agentData);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: Agent.updateAgent result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot update agents'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot update agents'}});
        } else
            res.status(200).send({ok: true, error: null, data: 'Agent updated'});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Agent.updateAgent failed');
        logger.error(caller, error);
        res.status(404).send({ok: false, error: {msg: 'Cannot update agent. Error: ' + error}});
        return;
    }
}
exports.deleteAgent  = async (req, res, next) => {
    const caller = 'deleteAgent';
    //Get userId from request
    const userId = req.userId;
    //Delete an existing agent from database
    const agentId = req.params['id'];
    //Delete it from database content
    try {
        const result = await Agent.deleteAgent(userId, agentId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: Agent.deleteAgent result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot delete agents'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot delete agents'}});
            return;
        } else
            res.status(200).send({ok: true, error: null, data: 'Agent deleted'});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Agent.deleteAgent failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot delete agent'}});
        return;
    }
}
exports.postCoreAgentCmd  = async (req, res, next) => {
    const caller = 'postCoreAgentCmd';
    //Get userId from request
    const userId = req.userId;
    //Get agentId from request parmas
    const agentId = req.params['id'];
    //Get cmd from body
    const cmd = req.body.cmd;
    //We need to send a status immediately to the console without waiting for the final status
    try {
        //Get agent status and return it
        const result = await Agent.getAgent(userId, agentId);
        if(!result.ok) {
            logger.log(caller, 'ERROR', 'ERROR: Agent.getAgent result is ko.');
            if(result.error && result.error.status) {
                const code = errorCode[result.error.status];
                res.status(code).send({ok: false, error: {msg: result.error.msg ? result.error.msg : 'Cannot end cmd to agents'}});
            } else
                res.status(400).send({ok: false, error: {msg: 'Cannot send cmd to agents'}});
            return;
        }
        const agent = result.data;
        res.status(200).send({ok: true, error: null, data: {id: agentId, isStarted: agent.isStarted}});
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Agent.getAgent failed');
        logger.error(caller, error);
        res.status(400).send({ok: false, error: {msg: 'Cannot get agent'}});
        return;
    }
    //Send command to the remote core agent
    try {
        const result = await Agent.sendCoreAgentCommand(userId, agentId, cmd);
        if(!result.ok)
            logger.log(caller, 'ERROR', 'ERROR: Agent.sendCoreAgentCommand result is ko.');
    } catch(error) {
        logger.log(caller, 'ERROR', 'ERROR: Agent.sendCoreAgentCommand failed');
        logger.error(caller, error);
    }
    return;
}