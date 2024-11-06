import React, { useState } from 'react';
import AgentDetailsHeader from './AgentDetailsHeader';
import AgentItems from './AgentItems';
import AgentNetworkItems from './AgentNetworkItems';
import AgentConnectionsItems from './AgentConnectionsItems';
import LogsLive from './LogsLive';
import '../stylesheets/AgentDetails.css';

const AgentDetails = ({ agent }) => {
    const [agentView, setAgentView] = useState(true);
    const [agentNetworkView, setAgentNetworkView] = useState(false);
    const [agentConnectionsView, setAgentConnectionsView] = useState(false);
    const [logsView, setLogsView] = useState(true);
    return(
        <div className='gb-details'>
            <AgentDetailsHeader agent={agent} agentView={agentView} agentNetworkView={agentNetworkView} agentConnectionsView={agentConnectionsView} logsView={logsView}
                changeAgentView={() => setAgentView(view => !view)}
                changeAgentNetworkView={() => setAgentNetworkView(view => !view)}
                changeAgentConnectionsView={() => setAgentConnectionsView(view => !view)} 
                changeLogsView={() => setLogsView(view => !view)}
            />
            <div className='gb-details-view'>
                {agentView && <AgentItems agent={agent} onClose={() => setAgentView(false)} />}
                {agentNetworkView && <AgentNetworkItems agent={agent} onClose={() => setAgentNetworkView(false)} />}
                {agentConnectionsView && <AgentConnectionsItems agent={agent} onClose={() => setAgentConnectionsView(false)} />}
                {logsView && <LogsLive context='agentdetails' agentName={agent.hostName} onClose={() => setLogsView(false)}/>}
            </div>
        </div>
    )
} 
export default AgentDetails