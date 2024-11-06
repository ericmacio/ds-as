import React, { useState, useContext } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { MainContext } from '../providers/MainProvider';
import ModifyUserProfile from './ModifyUserProfile';
import '../stylesheets/UserProfile.css';

const UserProfile = () => {
    const { userLogged } = useContext(MainContext);
    const [openProfileMenu, setOpenProfileMenu] = useState(false);
    //closeProfileMenu
    const closeProfileMenu = () => {
        setOpenProfileMenu(false);
    }
    return(
        <div className="userprofile">
            <div className='userprofile-user'>{userLogged.firstName}</div>
            <FaUserCircle size={30} className='userprofile-icon' onClick={() => setOpenProfileMenu(!openProfileMenu)} />
            <ModifyUserProfile isOpen={openProfileMenu} onClose={closeProfileMenu} />
        </div>
    )
}
export default UserProfile;