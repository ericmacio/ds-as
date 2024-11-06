import React, { useContext } from 'react';
import { FaRegPlayCircle, FaRegStopCircle, FaHeartbeat, FaHeartBroken, FaScroll, FaNetworkWired, FaPuzzlePiece } from 'react-icons/fa';
import UseAnimations from "react-useanimations";
import loading from 'react-useanimations/lib/loading';
import { MainContext } from '../providers/MainProvider';
import { AgentContext } from '../providers/AgentProvider';
import '../stylesheets/AgentDetailsHeader.css';

const AgentDetailsHeader = ({ agent, agentView, agentNetworkView, agentConnectionsView, logsView, changeAgentView, changeAgentNetworkView, changeAgentConnectionsView, changeLogsView }) => {
    const { Icons: { AgentsIcon } } = useContext(MainContext);
    const { onStartStop } = useContext(AgentContext);
    const { id, hostName, isRegistered, isHeartbeatOk, connections, status } = agent;
    const iconClassName = isRegistered ? 'agentdetails-header-avatar-registered' : isHeartbeatOk ? 'agentdetails-header-avatar-heartbeat-ok' : 'agentdetails-header-avatar-heartbeat-ko';
    const heartbeatIconClassName = isHeartbeatOk ? 'agentdetails-header-heartbeat-ok' : 'agentdetails-header-heartbeat-ko';
    const isConnected = connections && connections.length > 0;
    const connectionClassName = isConnected ? 'agentdetails-header-connected' : 'agentdetails-header-notconnected';
    const agentViewClassName = agentView ? 'gb-header-viewMenu-enable' : 'gb-header-viewMenu-disable';
    const agentNetworkViewClassName = agentNetworkView ? 'gb-header-viewMenu-enable' : 'gb-header-viewMenu-disable';
    const agentConnectionsViewClassName = agentConnectionsView ? 'gb-header-viewMenu-enable' : 'gb-header-viewMenu-disable';
    const logsViewClassName = logsView ? 'gb-header-viewMenu-enable' : 'gb-header-viewMenu-disable';
    const statusClassName = isHeartbeatOk ? 
        (status == 'registered' ? 'agentdetails-header-status-registered' : ((status == 'starting') || (status == 'stopping')) ? 'agentdetails-header-status-idle' : 'agentdetails-header-status-stopped')
        :
        'agentdetails-header-status-unreachable';
    return(
        <div className='gb-header-color gb-background-box gb-header'>
            <AgentsIcon size='24' className={iconClassName} />
            <div className='agentdetails-header-hostname'>{hostName}</div>
            <div className={heartbeatIconClassName}>{isHeartbeatOk ? <FaHeartbeat size={20} /> : <FaHeartBroken size={20} />}</div>
            <div className={`agentdetails-header-status ${statusClassName}`}>{status}</div>
            {(status == 'stopped') && <FaRegPlayCircle size={24} onClick={() => onStartStop(id, 'start')} className='agentdetails-header-start' />}
            {(status == 'registered') && <FaRegStopCircle size={24} onClick={() => onStartStop(id, 'stop')} className='agentdetails-header-stop' />}
            {(status == 'starting' || status == 'stopping') && <UseAnimations animation={loading} size={25} className='agentdetails-header-loading' />}
            <div className={connectionClassName}>{isConnected ? 'connected' : 'no active connection'}</div>
            <div className = 'gb-header-viewMenu'>
                <AgentsIcon size={20} className={agentViewClassName} onClick={() => changeAgentView()} />
                <FaNetworkWired size={20} className={agentNetworkViewClassName} onClick={() => changeAgentNetworkView()} />
                <FaPuzzlePiece size={20} className={agentConnectionsViewClassName} onClick={() => changeAgentConnectionsView()} />
                <FaScroll size={20} className={logsViewClassName} onClick={() => changeLogsView()} />
            </div>
        </div>
    )
} 
export default AgentDetailsHeader