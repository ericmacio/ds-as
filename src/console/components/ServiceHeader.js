import React from 'react';
import '../stylesheets/Service.css';

const ServiceHeader = ({ className, header }) => {
    return(
        <div className = {`${className}-${header.className}`}>{header.name}</div>
    )
}
export default ServiceHeader