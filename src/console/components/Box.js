import React from 'react';
import { NavLink } from 'react-router-dom';
import '../stylesheets/Box.css';

const Box = (box) => {
    const { name, Icon, link } = box;
    return(
        <div className='link'>
            <NavLink to={link}>
                <div className='gb-background-box gb-box box'>
                    <Icon size='30' className='gb-text-color' />
                    {name}
                </div>
            </NavLink>
        </div>
    )
}
export default Box;