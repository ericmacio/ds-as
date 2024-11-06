import React, { useContext } from 'react';
import { MainContext } from '../providers/MainProvider';
import '../stylesheets/DisplayError.css';

const DisplayError = () => {
    const { errorMsg, closeErrorMsg } = useContext(MainContext);
    return(
        <div className='displayerror-overlay'>
            <div className='displayerror-display'>
                <div className="displayerror-display-text">
                    {errorMsg}
                </div>
                <button onClick={closeErrorMsg}>Close</button>
            </div>
        </div>
    )
}
export default DisplayError