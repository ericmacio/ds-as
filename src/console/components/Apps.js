import React, { useContext } from 'react';
import { BsPlusCircle } from 'react-icons/bs';
import { AppContext } from '../providers/AppProvider';
import App from './App';
import Search from './Search';
import '../stylesheets/Apps.css';

const Apps = () => {
    const { loading, apps, openEditApp, searchAppInput, setSearchAppInput } = useContext(AppContext);
    const getFilteredApps = () => {
        return (
            (searchAppInput != '') ?
            apps.filter(app => (app.name.indexOf(searchAppInput) >= 0)).map((app, id) => <App key={id} {...app} />)
            :
            apps.map((app, id) => <App key={id} {...app} />)
        )
    }
    return(
        <div className='gb-listcontainer'>
            <div className='gb-listcontainer-menu'>
                <div className='gb-listcontainer-menu-actions'>
                    <button className='gb-background' name='add' onClick={() => openEditApp()}> <BsPlusCircle size={24}/> </button>
                </div>
                <Search searchInput={searchAppInput} setSearchInput={setSearchAppInput}/>
            </div>
            <div className='gb-listcontainer-list'>
                {(loading) ? <div>Loading apps ...</div> : (apps.length == 0) ? <div>No apps</div> : getFilteredApps()}
            </div>
        </div>
    )
}
export default Apps;