import React from 'react';
import '../stylesheets/AgentConnection.css';

const AgentConnection = (connection) => {
    console.log('connection: ' + JSON.stringify(connection));
    const { proxyId, asAgentId, type, params } = connection;
    return(
        <>
        <div className='gb-items-data'>type: {type}</div>
        <div className='gb-items-data'>proxyId: {proxyId}</div>
        <div className='gb-items-data'>asAgentId: {asAgentId}</div>
        <div className='gb-items-data'>params: {JSON.stringify(params)}</div>
        </>
    )
}
export default AgentConnection