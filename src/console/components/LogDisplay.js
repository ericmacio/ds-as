import React from 'react';
import LogMsg from './LogMsg';
import '../stylesheets/LogDisplay.css';

const LogDisplay = ({context, logMsgChildren, setLastMsgRef}) => {
    return(
        <div className = {`logdisplay-${context}`}>
            <div className = {`logarea-${context}`}>
                {logMsgChildren.map((logMsg, i) => 
                    <LogMsg key={i} logMsg={logMsg} setLastMsgRef={setLastMsgRef} />
                )}
            </div>
        </div>
    )
}
export default LogDisplay