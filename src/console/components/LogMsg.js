import React from 'react';
import '../stylesheets/LogMsg.css';

const LogMsg = ({logMsg, setLastMsgRef}) => {
    return(
        <div className = {logMsg.includes('ERROR') ? 'logMsgError' : logMsg.includes('WARNING') ? 'logMsgWarning' : 'logMsg'}>
            {logMsg}
            <div style={{ float:"left", clear: "both" }} ref={(msg) => { setLastMsgRef(msg); }}></div>
        </div>
    )
}
export default LogMsg