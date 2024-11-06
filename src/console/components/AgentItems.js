import React, { useContext } from 'react';
import { FaPencilAlt } from 'react-icons/fa';
import { BsX } from 'react-icons/bs';
import { AgentContext } from '../providers/AgentProvider';
import '../stylesheets/AgentItems.css';

const AgentItems = ({ agent, onClose }) => {
    const { hostName, coreVersion, agentVersion, isRegistered, registrationTime, lastRegistrationTime, isHeartbeatOk, lastHeartbeatTime, mustUpdate } = agent;
    const { openEditAgent } = useContext(AgentContext);
    return(
        <div className='gb-background-box gb-items agent-items'>
            <div className='gb-color-box gb-items-menu'>
                <FaPencilAlt size={15} onClick={() => openEditAgent(agent.id)} className='gb-items-menu-edit' />
                <BsX size={15} onClick={onClose} className='gb-items-menu-close' />
            </div>
            <div className='gb-title-color gb-items-title'>Properties</div>
            <div className='gb-items-list'>
                <div className='gb-items-data'>Hostname: {hostName}</div>
                <div className='gb-items-data'>Core version: {coreVersion}</div>
                <div className='gb-items-data'>Agent version: {agentVersion}</div>
                {!isHeartbeatOk && <div className='gb-items-data'>LastHeartbeat: {new Date(lastHeartbeatTime).toLocaleString()}</div>}
                {isRegistered && <div className='gb-items-data'>Registration: {new Date(registrationTime).toLocaleString()}</div>}
                {!isRegistered && <div className='gb-items-data'>LastRegistration: {new Date(lastRegistrationTime).toLocaleString()}</div>}
                {mustUpdate && <div className='gb-items-data agent-update'>New version available</div>}
            </div>
        </div>
    )
}
export default AgentItems