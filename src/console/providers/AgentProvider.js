import React, { useState, useEffect, useContext, createContext } from 'react';
import { MainContext } from './MainProvider';
import AddAgent from '../components/AddAgent';
import Dialog from '../components/Dialog';
import { createAgent, updateAgent, getAgents, deleteAgent, sendAgentCmd } from '../utils/Api';

var wsAgent;

export const AgentContext = createContext();

export const AgentProvider = ({ children }) => {
    const { loadingConfig, isAuthenticated, config, handleErrorRequest } = useContext(MainContext);
    const [loading, setLoading] = useState(true);
    const [searchAgentInput, setSearchAgentInput] = useState('');
    const [editAgentOpen, setEditAgentOpen] = useState(false);
    const [agentToEdit, setAgentToEdit] = useState();
    const [agentToDelete, setAgentToDelete] = useState();
    const [dialogAgentOpen, setDialogAgentOpen] = useState(false);
    const [agents, setAgents] = useState([]);

    //openRemoveAgent
    const openRemoveAgent = (id) => {
        const agent = agents.find(agent => agent.id == id);
        setAgentToDelete(agent);
        setDialogAgentOpen(true);
    }
    //onConfirmAgentDialog
    const onConfirmAgentDialog = () => {
        onRemoveAgent(agentToDelete.id);
        setAgentToDelete(null);
        setDialogAgentOpen(false);
    }
    //onCloseAgentDialog
    const onCloseAgentDialog = () => {
        setAgentToDelete(null);
        setDialogAgentOpen(false);
    }
    //onCloseEditAgent
    const closeEditAgent = () => {
        setEditAgentOpen(false);
        setAgentToEdit(null);
    }
    //openEditAgent
    const openEditAgent = (id) => {
        if(id) {
            const agent = agents.find(agent => agent.id == id);
            setAgentToEdit(agent);
        }
        setEditAgentOpen(true);
    }
    //setAgentStatus
    const setAgentStatus = (msg) => {
        const { hostName, registered, registrationTime, lastRegistrationTime, heartbeat, lastHeartbeatTime, connections, status, coreVersion, agentVersion, mustUpdate } = msg;
        console.log('Receive agent notify message. hostName: ' + hostName + ', registered: ' + registered + ', registrationTime: ' + registrationTime
            + ', lastRegistrationTime: ' + lastRegistrationTime + ', heartbeat: ' + heartbeat + ', lastHeartbeatTime: ' + lastHeartbeatTime
            + ', connections length: ' + connections.length + ', status: ' + status + ', coreVersion: ' + coreVersion + ', agentVersion: ' + agentVersion
            + ', mustUpdate: ' + mustUpdate);
        const newAgents = agents.map((agent) => (agent.hostName == hostName) ? {...agent, isRegistered: registered, registrationTime, lastRegistrationTime, isHeartbeatOk: heartbeat, lastHeartbeatTime, connections, status, coreVersion, agentVersion, mustUpdate} : agent);
        setAgents(newAgents);
    }
    //onAgentNotification
    const onAgentNotification = (msg) => {
        //We have been notified about agent status change
        if(msg.type == 'NotifyMessage') {
            //Update agent status
            setAgentStatus(msg);
        } else
            console.log('ERROR: unknown msg type: ' + msg.type)
    }
    //onAddAgent
    const onAddAgent = async({ id, hostName }) => {
        try {
            if(id)
                //Modify existing agent
                var result = await updateAgent(id, { hostName });
            else
                //Create new agent
                var result = await createAgent({ hostName });
            if(!result.ok) {
                console.log('ERROR: createAgent / updateAgent result is ko');
                handleErrorRequest(result.error);
            }
        } catch(error) {
            console.log('ERROR: updateAgent or createAgent failed');
        }
        //Update Agents list
        try {
            const result = await getAgents();
            if(!result.ok) {
                console.log('ERROR: getAgents result is ko');
                handleErrorRequest(result.error);
            } else 
                setAgents(result.data);
        } catch(error) {
            console.log('ERROR: getAgents failed: ' + error);
        }
    }
    //onRemoveAgent
    const onRemoveAgent = async(id) => {
        //Delete the agent
        try{
            const result = await deleteAgent(id);
            if(!result.ok) {
                console.log('ERROR:  deleteAgent result is ko');
                handleErrorRequest(result.error);
            }
        } catch(error) {
            console.log('ERROR:  deleteAgent failed: ' + error);
        }
        //Update agents list
        try {
            const result = await getAgents();
            if(!result.ok) {
                console.log('ERROR: getAgents result is ko');
                handleErrorRequest(result.error);
            } else 
                setAgents(result.data);
        } catch(error) {
            console.log('ERROR: getAgents failed: ' + error);
        }
    }
    //onStartStop
    const onStartStop = async(id, action) => {
        //Update agent status
        if((action == 'start') || (action == 'stop')) {
            //Get agent
            const agent = agents.find(agent => agent.id == id);
            if(agent) {
                //console.log('agent: ' +  JSON.stringify(agent));
                //console.log('Process agent request: ' + agent.name);
                if((agent.status == 'starting') 
                || (agent.status == 'stopping') 
                || ((agent.status == 'running') && (action == 'start')) 
                || ((agent.status == 'stopped') && (action == 'stop'))) {
                    console.log('Agent status is already ' + agent.status + '. Do nothing');
                    return;
                }
                //Agent status will be updated later on proxy notification
                try {
                    const cmd = {name: action};
                    const result = await sendAgentCmd(id, cmd);
                    if(!result.ok) {
                        console.log('ERROR: sendAgentCmd failed');
                        //Update agent status
                        let newAgents = agents.map((agent) => (agent.id == id) ? {...agent, status: 'error'} : agent);
                        setAgents(newAgents);
                        handleErrorRequest(result.error);
                    }
                } catch(error) {
                    console.log('ERROR: sendAgentCmd failed: ' + error);
                }
            } else
                console.log('ERROR: Agent not found. Id: ' + id);
        } else
            console.log('ERROR: Unknown action ' + action);
            //Status will be updated from server notification via web socket once changed on the server
    }
    //getServerAgents
    const getServerAgents = async() => {
        try{
            const result = await getAgents();
            if(!result.ok) {
                console.log('ERROR: getAgents result is ko');
                handleErrorRequest(result.error);
            } else {
                setAgents(result.data);
                setLoading(false);
            }
        } catch(error) {
            console.log('ERROR: getAgents failed: ' + error);
        }
    }
    //useEffect
    useEffect(() => {
        //Get configuration
        isAuthenticated && getServerAgents();
    }, [isAuthenticated]);
    //useEffect
    useEffect(() => {
        //Connect to agent notification server so that we will keep informed about the agents' status
        if(loadingConfig) return;
        const { wsAgentConfig } = config;
        if(!wsAgent) {
            const wsServer = wsAgentConfig.url + wsAgentConfig.ip + ':' + wsAgentConfig.port;
            wsAgent =  new WebSocket(wsServer);
        }
        wsAgent.onopen = () => {
            const helloMsg = {type: 'hello', data: 'Websocket client'};
            wsAgent.send(JSON.stringify(helloMsg));
        };
        wsAgent.onmessage = (event) => {
            var msg = JSON.parse(event.data);
            if(msg.type == 'helloResponse') {
                wsAgent.clientId = msg.clientId;
                console.log('Connected to agent notify web socket. Client id: ' + wsAgent.clientId);
            } else
                onAgentNotification(msg);
        };
        wsAgent.onclose = () => {
            wsAgent.close();
        };
    }, [loadingConfig, agents]);
    return (
        <AgentContext.Provider value={{
            loading, agents, searchAgentInput, agentToEdit, editAgentOpen, dialogAgentOpen, 
            onCloseAgentDialog, onConfirmAgentDialog, openRemoveAgent, closeEditAgent, openEditAgent, onAddAgent, setSearchAgentInput, onStartStop }}>
            {editAgentOpen && <AddAgent />}
            {dialogAgentOpen && <Dialog onCloseDialog={onCloseAgentDialog} onConfirmDialog={onConfirmAgentDialog} 
                title='Are you sure ?' text={`Please confirm you want to delete the agent ${agentToDelete.hostName}`} />}
            {children}
        </AgentContext.Provider>
    )
}