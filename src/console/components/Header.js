import React, { useContext } from 'react';
import TopMenu from './TopMenu';
import { MainContext } from '../providers/MainProvider';
import UserProfile from './UserProfile';
import '../stylesheets/Header.css';

const Header = ({ name, Icon, menuItems }) => {
    const { isAuthenticated } = useContext(MainContext);
    return(
        <div className="header gb-text-color">
            <div id='icon'><Icon size={24}/></div>
            <div id='name'>{name}</div>
            {isAuthenticated && <UserProfile />}
            <TopMenu menuItems={menuItems} />
        </div>
    )
}
export default Header;