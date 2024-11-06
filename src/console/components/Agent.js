import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { FaPencilAlt, FaHeartbeat, FaHeartBroken, FaRegPlayCircle, FaRegStopCircle } from 'react-icons/fa';
import UseAnimations from "react-useanimations";
import loading from 'react-useanimations/lib/loading';
import { BsFillTrashFill } from 'react-icons/bs';
import { MainContext } from '../providers/MainProvider';
import { AgentContext } from '../providers/AgentProvider';
import '../stylesheets/Agent.css';

const Agent = (agent) => {
    const { Icons: { AgentsIcon } } = useContext(MainContext);
    const { openEditAgent, openRemoveAgent, onStartStop } = useContext(AgentContext);
    const { id, hostName, network, registrationTime, isRegistered, isHeartbeatOk, connections, status } = agent;
    const dateString = registrationTime ? new Date(registrationTime).toLocaleDateString() : '';
    const timeString = registrationTime ? new Date(registrationTime).toLocaleTimeString() : '';
    const iconClassName = isRegistered ? 'agent-item-avatar-registered' : 'agent-item-avatar';
    const heartbeatIconClassName = isHeartbeatOk ? 'agent-item-heartbeat-ok' : 'agent-item-heartbeat-ko';
    const isConnected = connections && connections.length > 0;
    const connectionClassName = isConnected ? 'agent-item-connected' : 'agent-item-notconnected';
    const statusClassName = isHeartbeatOk ? 
        (status == 'registered' ? 'agent-status-registered' : ((status == 'starting') || (status == 'stopping')) ? 'agent-status-idle' : 'agent-status-stopped')
        :
        'agent-status-unreachable';
    return(
        <div className='gb-background-box gb-box agent'>
            <div className='gb-color-box gb-box-menu'>
                <FaPencilAlt size={15} onClick={() => openEditAgent(id)} className='gb-menu-edit' />
                <BsFillTrashFill size={15} onClick={() => openRemoveAgent(id)} className='gb-menu-delete' />
            </div>
            <NavLink className='agent-link' to={`/agents/${id}`}>
                <div className='gb-items-list agent-items-list'>
                    <AgentsIcon size={30} className={iconClassName} />
                    <div className='agent-item-hostname'>{hostName}</div>
                    <div className={statusClassName}>{status}</div>
                    <div className='gb-items-data'>{isRegistered ? 'Since ' + dateString : ''}</div>
                    <div className='gb-items-data'>{isRegistered ? 'At ' + timeString : ''}</div>
                    <div className={heartbeatIconClassName}>{isHeartbeatOk ? <FaHeartbeat size={20} /> : <FaHeartBroken size={20} />}</div>
                    <div className='gb-items-data'>{isRegistered ? 'IP:' + network.address : ''}</div>
                    <div className={connectionClassName}>{isConnected ? 'connected' : 'no connections'}</div>
                </div>
            </NavLink>
            {(status == 'stopped') && <FaRegPlayCircle size={25} onClick={() => onStartStop(id, 'start')} className='agent-start' />}
            {(status == 'registered') && <FaRegStopCircle size={25} onClick={() => onStartStop(id, 'stop')} className='agent-stop' />}
            {(status == 'starting' || status == 'stopping') && <UseAnimations animation={loading} size={25} className='agent-loading' />}
        </div>
    )
}
export default Agent;