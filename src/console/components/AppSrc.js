import React from 'react';
import { BsX } from 'react-icons/bs';
import '../stylesheets/AppSrc.css';

const AppSrc = ({ src, onClose }) => {
    return (
        <div className='gb-background-box gb-items appsrc'>
            <div className='gb-color-box gb-items-menu'>
                <BsX size={15} onClick={onClose} className='gb-items-menu-close' />
            </div>
            <div className='gb-title-color gb-items-title'>Source file</div>
            <div className='appsrc-txt'>
                {src ? src : 'loading'}
            </div>
        </div>
    )
}
export default AppSrc