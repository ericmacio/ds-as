import React from 'react';
import { BsX } from 'react-icons/bs';
import AgentConnection from './AgentConnection';
import '../stylesheets/AgentConnectionsItems.css';

const AgentConnectionsItems = ({ agent, onClose }) => {
    const { connections=[] } = agent;
    return(
        <div className='gb-background-box gb-items agent-connections'>
            <div className='gb-color-box gb-items-menu'>
                <BsX size={15} onClick={onClose} className='gb-items-menu-close' />
            </div>
            <div className='gb-title-color gb-items-title'>Connections</div>
            <div className='gb-items-list'>
                {connections.length > 0 ? 
                    connections.map((connection, id) => <AgentConnection key={id} {...connection} />)
                    : 'No active connection'}
            </div>
        </div>
    )
}
export default AgentConnectionsItems