import React, { useState, useEffect, createContext, useContext } from 'react';
import { MainContext } from './MainProvider';
import { getUsers, createUser, updateUser, deleteUser } from '../utils/Api';
import AddUser from '../components/AddUser';
import Dialog from '../components/Dialog';
import '../stylesheets/SettingUsers.css';

export const SettingUsersContext = new createContext();

export const UserProvider = ({ children }) => {
    const { isAuthenticated, handleErrorRequest } = useContext(MainContext);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [editUserOpen, setEditUserOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState();
    const [userToDelete, setUserToDelete] = useState();
    const [dialogOpen, setDialogOpen] = useState(false);
    //openRemoveUser
    const onOpenRemoveUser = (id) => {
        const user = users.find(user => user.id == id);
        setUserToDelete(user);
        setDialogOpen(true);
    }
    //onConfirmDialog
    const onConfirmDialog = () => {
        onRemoveUser(userToDelete.id);
        setUserToDelete(null);
        setDialogOpen(false);
    }
    //onCloseDialog
    const onCloseDialog = () => {
        setUserToDelete(null);
        setDialogOpen(false);
    }
    //onOpenEditUser
    const onOpenEditUser = (id) => {
        if(id) {
            const user = users.find(user => user.id == id);
            setUserToEdit(user);
        }
        setEditUserOpen(true);
    }
    //onCloseEditUser
    const onCloseEditUser = () => {
        setEditUserOpen(false);
        setUserToEdit(null);
    }
    const onAddUser = async({ id, name, firstName, email, password, organization, role }) => {
        const userData = { name, firstName, email, password, organization, role };
        try{
            if(id)
                //Modify existing user
                var result = await updateUser(id, userData);
            else
                //Create new user
                var result = await createUser(userData);
            if(!result.ok) {
                console.log('ERROR: create/update user result is ko');
                handleErrorRequest(result.error);
                return;
            }
        } catch(error) {
            console.log('ERROR: updateUser or createUser failed: ' + error);
        }
        //Update users list
        try {
            const result = await getUsers();
            if(!result.ok) {
                console.log('ERROR: getUsers failed for users');
                handleErrorRequest(result.error);
            } else
                setUsers(result.data);
        } catch(error) {
            console.log('ERROR: getUsers failed: ' + error);
        }
    }
    const onRemoveUser = async(id) => {
        //Delete the user
        try{
            const result = await deleteUser(id);
            if(!result.ok) {
                console.log('ERROR: deleteUser failed');
                handleErrorRequest(result.error);
            }
        } catch(error) {
            console.log('ERROR: deleteUser failed: ' + error);
        }
        //Update users list
        try {
            const result = await getUsers();
            if(!result.ok) {
                console.log('ERROR: getUsers failed for users');
                handleErrorRequest(result.error);
            }
            else
                setUsers(result.data);
        } catch(error) {
            console.log('ERROR: getUsers failed: ' + error);
        }
    }
    //useEffect
    useEffect(() => {
        const getUserList = async() => {
            try {
                const result = await getUsers();
                setLoading(false);
                if(!result.ok) {
                    console.log('ERROR: getUsers failed for users');
                    handleErrorRequest(result.error);
                } else {
                    setUsers(result.data);
                }
            } catch(error) {
                console.log('ERROR: getUsers failed');
            }
        }
        //Get list of users
        isAuthenticated && getUserList();
    }, [isAuthenticated]);
    return(
        <SettingUsersContext.Provider value={{ users, loading, userToEdit, onOpenRemoveUser, onAddUser, onCloseEditUser, onOpenEditUser }}>
            {editUserOpen && <AddUser />}
            {dialogOpen && <Dialog onCloseDialog={onCloseDialog} onConfirmDialog={onConfirmDialog}
                title='Are you sure ?' text={`Please confirm you want to delete the user ${userToDelete.name}`} />}
            {children}
        </SettingUsersContext.Provider>
    )
}