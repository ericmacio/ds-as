import React, { useState, useContext, useEffect, useRef } from 'react';
import { FaExpeditedssl, FaSignOutAlt } from 'react-icons/fa';
import { MainContext } from '../providers/MainProvider';
import ModifyUserPassword from './ModifyUserPassword';
import '../stylesheets/ModifyProfile.css';

const ModifyUserProfile = ({ isOpen, onClose }) => {
    const { userLogged, logout } = useContext(MainContext);
    const [editPasswordChange, setEditPasswordChange] = useState(false);
    const menuRef = useRef(null);
    //onOpenEditPasswordChange
    const onOpenEditPasswordChange = () => {
        setEditPasswordChange(true);
        onClose();
    }
    //onCloseEditUserProfile
    const onCloseEditPasswordChange = () => {
        setEditPasswordChange(false);
    }
    //useEffect
    useEffect(() => {
        const pageClickEvent = (e) => {
            //Close menu if click is outside
            if (menuRef.current !== null && !menuRef.current.contains(e.target))
                onClose();
        }
        // If the menu is open then listen for clicks
        if (isOpen)
            window.addEventListener('click', pageClickEvent);
        //Remove listener when going out of the component
        return () => {
            window.removeEventListener('click', pageClickEvent);
        }
    }, [isOpen]);
    return (
        <>
            <menu ref={menuRef} className={isOpen ? 'gb-dropdown-menu gb-dropdown-menu-height gb-background-dark gb-active' : 'gb-dropdown-menu gb-background-dark'}>
                <li className='gb-link' onClick={onOpenEditPasswordChange} onClose={onCloseEditPasswordChange}>
                    <FaExpeditedssl size={18} />
                    <span className='modifyuserprofile-link'>Change password</span>
                </li>
                <li className='gb-link' onClick={logout}>
                    <FaSignOutAlt size={18} />
                    <span className='modifyuserprofile-link'>Logout</span>
                </li>
            </menu>
            {editPasswordChange && <ModifyUserPassword user={userLogged} onClose={onCloseEditPasswordChange}></ModifyUserPassword>}
        </>
    )
}
export default ModifyUserProfile;