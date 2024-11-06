import React from 'react';
import '../stylesheets/checkbox.css';

const Checkbox = ({checkbox, onClick}) => {
    const {name, value, checked, label} = checkbox;
    return(
        <div className='checkbox'>
            <label><input type='checkbox' name={name} value={value} checked={checked} onChange={onClick} />{label}</label>
        </div>
    )
}
export default Checkbox