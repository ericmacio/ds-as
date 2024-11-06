import React from "react";
import { NavLink } from 'react-router-dom';
import '../stylesheets/TopMenu.css';

const TopMenu = ({menuItems}) => {
    return(
        <nav className="topmenu">
            {menuItems.map((item, id) =>
                <NavLink key={id} className="topmenu-link" activeClassName="topmenu-link--active" exact to={item.path}>{item.name}</NavLink>
            )}
        </nav>
    )
}
export default TopMenu;