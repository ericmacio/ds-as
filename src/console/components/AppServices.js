import React from 'react';
import { BsX } from 'react-icons/bs';
import '../stylesheets/AppServices.css';

const AppServices = ({ appServices, onClose }) => {
    return(
        <div className='gb-background-box gb-items app-services'>
            <div className='gb-color-box gb-items-menu'>
                <BsX size={15} onClick={onClose} className='gb-items-menu-close' />
            </div>
            <div className='gb-title-color  gb-items-title'>Services</div>
            <div className='gb-items-list'>
                {appServices.map((service, id) => <div key={id} className='gb-items-data'>Service: {service}</div>)}
            </div>
        </div>
    )
}
export default AppServices;