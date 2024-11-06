import React, { useContext, useState } from 'react';
import { BsPlusCircle } from 'react-icons/bs';
import { SettingUsersContext } from '../providers/UserProvider';
import Search from './Search';
import User from './User';
import '../stylesheets/SettingUsers.css';

const SettingUsers = () => {
    const { users, loading, onOpenEditUser } = useContext(SettingUsersContext);
    const [searchUserInput, setSearchUserInput] = useState('');
    const getFilteredUsers = () => {
        return (
            (searchUserInput != '') ?
            users.filter(user => (user.name.indexOf(searchUserInput) >= 0) || (user.firstName.indexOf(searchUserInput) >= 0))
                .map((user, id) => <User key={id} {...user} />)
            :
            users.map((user, id) => <User key={id} {...user} />)
        )
    }
    return(
        <div className='gb-listcontainer'>
            <div className='gb-listcontainer-menu'>
                <div className='gb-listcontainer-menu-actions'>
                    <button className='gb-background-color' name='add' onClick={() => onOpenEditUser()}> <BsPlusCircle size={24}/> </button>
                </div>
                <Search searchInput={searchUserInput} setSearchInput={setSearchUserInput}/>
            </div>
            <div className='gb-listcontainer-list'>
                {(loading) ? <div>Loading users ...</div> : (users.length == 0) ? <div>No users</div> : getFilteredUsers()}
            </div>
        </div>
    )
}
export default SettingUsers;