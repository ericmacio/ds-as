import React, { useContext } from 'react';
import { FaUserTie, FaPencilAlt } from 'react-icons/fa';
import { BsFillTrashFill } from 'react-icons/bs';
import { SettingUsersContext } from '../providers/UserProvider';
import '../stylesheets/User.css';

const User = (user) => {
    const { onOpenEditUser, onOpenRemoveUser } = useContext(SettingUsersContext);
    const { id, role, firstName, name, organization } = user;
    return(
        <div className='gb-background-box gb-box user-box'>
            <div className='gb-color-box gb-box-menu'>
                <FaPencilAlt size={15} onClick={() => onOpenEditUser(id)} className='gb-items-edit' />
                <BsFillTrashFill size={15} onClick={() => onOpenRemoveUser(id)} className='gb-items-delete' />
            </div>
            <div className='gb-title-color gb-items-title'>Properties</div>
            <div className='gb-items-list user-items-list'>
                <FaUserTie size={30} className='user-avatar' />
                <div className='gb-items-data'>{name}</div>
                <div className='gb-items-data'>{firstName}</div>
                <div className='gb-items-data'>{role}</div>
                <div className='gb-items-data'>{organization}</div>
            </div>
        </div>
    )
}
export default User;