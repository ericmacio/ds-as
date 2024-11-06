import React from 'react';
import { BsX } from 'react-icons/bs';
import '../stylesheets/AgentNetworkItems.css';

const AgentNetworkItems = ({ agent, onClose }) => {
    const { hostName, network } = agent;
    return(
        <div className='gb-background-box gb-items agent-network'>
            <div className='gb-color-box gb-items-menu'>
                <BsX size={15} onClick={onClose} className='gb-items-menu-close' />
            </div>
            <div className='gb-title-color gb-items-title'>Network</div>
            <div className='gb-items-list'>
                <div className='gb-items-data'>Hostname: {hostName}</div>
                <div className='gb-items-data'>Adress: {network.address}</div>
                <div className='gb-items-data'>Family: {network.family}</div>
                <div className='gb-items-data'>Mac: {network.mac}</div>
                <div className='gb-items-data'>Name: {network.name}</div>
                <div className='gb-items-data'>Netmask: {network.netmask}</div>
            </div>
        </div>
    )
}
export default AgentNetworkItems;