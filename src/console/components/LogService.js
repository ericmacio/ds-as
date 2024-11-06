import React from 'react';
import '../stylesheets/LogService.css';

const LogService = ({logServiceList=[], logServiceName, onClick}) => {
    return(
        <div className = 'selectService'>
            <div className='title'>Service: </div>
            <select className='list' value={logServiceName} onChange={onClick} >
                {logServiceList.map((serviceName, i) => 
                    <option key={i} value={serviceName} label={serviceName} />
                )}
            </select>
        </div>
    )
}
export default LogService