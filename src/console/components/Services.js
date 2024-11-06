import React, { useContext } from 'react';
import { BsPlusCircle } from 'react-icons/bs';
import { ServiceContext } from '../providers/ServiceProvider';
import Service from './Service';
import Search from './Search';
import '../stylesheets/Services.css';

const Services = () => {
    const { loading, services, openEditService, searchServiceInput, setSearchServiceInput } = useContext(ServiceContext);
    const getFilteredServices = () => {
        return (
            (searchServiceInput != '') ?
            services.filter(service => (service.name.indexOf(searchServiceInput) >= 0) || (service.app.indexOf(searchServiceInput) >= 0))
                .map((service, id) => <Service key={id} {...service} />)
            :
            services.map((service, id) => <Service key={id} {...service} />)
        )
    }
    return(
        <div className='gb-listcontainer'>
            <div className='gb-listcontainer-menu'>
                <div className='gb-listcontainer-menu-actions'>
                    <button className='gb-background' name='add' onClick={() => openEditService()}> <BsPlusCircle size={24}/> </button>
                </div>
                <Search searchInput={searchServiceInput} setSearchInput={setSearchServiceInput}/>
            </div>
            <div className='gb-listcontainer-list'>
                {(loading) ? <div>Loading services ...</div> : (services.length == 0) ? <div>No services</div> : getFilteredServices()}
            </div>
        </div>
    )
}
export default Services;