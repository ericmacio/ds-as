import React from 'react';
import '../stylesheets/Dialog.css';

const Dialog = ( { title, text, onCloseDialog, onConfirmDialog }) => {
    return (
        <div className='dialog-overlay'>
            <div className='dialog-display'>
                <div className='dialog-display-title'>{title}</div>
                <div className='dialog-display-text'>{text}</div>
                <div className='dialog-display-button'>
                    <button onClick={onCloseDialog}>Cancel</button>
                    <button onClick={onConfirmDialog}>Confirm</button>
                </div>
            </div>
        </div>
    )
}
export default Dialog;