import React, { useState, useContext } from 'react';
import { SettingUsersContext } from '../providers/UserProvider';
import '../stylesheets/AddUser.css';

const AddUser = () => {
    const { users, onAddUser, onCloseEditUser, userToEdit } = useContext(SettingUsersContext);
    const [name, setName] = useState(userToEdit ? userToEdit.name : '');
    const [firstName, setFirstName] = useState(userToEdit ? userToEdit.firstName : '');
    const [comment, setComment] = useState('');
    const [email, setEmail] = useState(userToEdit ? userToEdit.email : '');
    const [password, setPassword] = useState(userToEdit ? userToEdit.password : '');
    const [organization, setOrganization] = useState(userToEdit ? userToEdit.organization : '');
    const [role, setRole] = useState(userToEdit ? userToEdit.role : 'contributor');
    const onSubmit = (event) => {
        event.preventDefault();
        const id = userToEdit ? userToEdit.id : null;
        if(userToEdit)
            onAddUser({ id, name, firstName, email, organization, role });
        else if (name && firstName && email && password && organization && role)
            onAddUser({ id, name, firstName, email, password, organization, role });
        else
            alert('Missing fields ...');
        onCloseEditUser();
    }
    const onChangeEmail = (event) => {
        const emailExist = users.find(user => user.email == event.target.value);
        if(emailExist)
            setComment('Email already exist. Please choose another one');
        else {
            setEmail(event.target.value);
            setComment('');
        }
    }
    return (
        <div className='gb-overlay'>
            <form className='gb-add-form'>
                <h1>Please fill the form below and submit it</h1>
                <label>User name:
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        type='text'
                        placeholder='Enter user name'
                        required
                    />
                </label>
                <label>User first name:
                    <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        type='text'
                        placeholder='Enter user first name'
                        required
                    />
                </label>
                <label>User email:
                    <input
                        value={email ? email : ''}
                        onChange={onChangeEmail}
                        type='email'
                        placeholder='Enter user email'
                        required
                    />
                    <div className='gb-add-form-comment'>{comment}</div>
                </label>
                {userToEdit ? 
                    null
                :
                    <label>User password:
                        <input
                            value={password ? password : ''}
                            onChange={(e) => setPassword(e.target.value)}
                            type='password'
                            placeholder='Enter user password'
                            required
                        />
                    </label>
                }
                <label>Role:
                    <input
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        type='text'
                        placeholder='Enter user role'
                        required
                    />
                </label>
                <label>Organization:
                    <input
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        type='text'
                        placeholder='Enter user organization'
                        required
                    />
                </label>
                <div className='gb-form-button'>
                    <button onClick={onSubmit}>Submit</button>
                    <button onClick={onCloseEditUser}>Cancel</button>
                </div>
            </form>
        </div>
    )
} 
export default AddUser