import React, { useContext } from "react";
import { NavLink } from 'react-router-dom';
import { MainContext } from '../providers/MainProvider';
import '../stylesheets/MainMenu.css';

const MainMenu = ({ logos }) => {
    const { Icons : { HomeIcon, AppsIcon, ServicesIcon, LogsIcon, AgentsIcon, SettingsIcon } } = useContext(MainContext);
    const {asLogo, pikselLogo} = logos;
    return(
        <nav className="gb-background-dark mainmenu">
            <img id = "logoas" alt="AS logo" src = {asLogo}></img>
            <NavLink exact={true} className="mainmenu-link" activeClassName="mainmenu-link--active" to="/home"><HomeIcon size={24} /><p>Home</p></NavLink>
            <NavLink className="mainmenu-link" activeClassName="mainmenu-link--active" to="/apps"><AppsIcon size={24} /><p>Apps</p></NavLink>
            <NavLink className="mainmenu-link" activeClassName="mainmenu-link--active" to="/services"><ServicesIcon size={24} /><p>Services</p></NavLink>
            <NavLink className="mainmenu-link" activeClassName="mainmenu-link--active" to="/logs"><LogsIcon size={24} /><p>Logs</p></NavLink>
            <NavLink className="mainmenu-link" activeClassName="mainmenu-link--active" to="/agents"><AgentsIcon size={24} /><p>Agents</p></NavLink>
            <NavLink className="mainmenu-link" activeClassName="mainmenu-link--active" to="/settings"><SettingsIcon size={24} /><p>Settings</p></NavLink>
            <img id = "logopiksel" alt="Piksel logo" src = {pikselLogo}></img>
        </nav>
    )
}
export default MainMenu;