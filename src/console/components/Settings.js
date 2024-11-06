import React from 'react';
import { FaUsers, FaProjectDiagram, FaObjectUngroup, FaUserFriends } from 'react-icons/fa';
import Box from './Box';
import '../stylesheets/Settings.css';

const settings = [
    {name: 'Users', Icon: FaUsers, link: '/settings/users'},
    {name: 'Proxy', Icon: FaProjectDiagram, link: '/settings/proxy'},
    {name: 'Organizations', Icon: FaUserFriends, link: '/settings/organizations'},
    {name: 'Groups', Icon: FaObjectUngroup, link: '/settings/groups'}
];

const Settings = () => {
    return(
        <div className='gb-listcontainer'>
            <div className='gb-listcontainer-list settings'>
                {settings.map((setting, id) => <Box key={id} {...setting} />)}
            </div>
        </div>
    )
}
export default Settings;