import React from 'react';
import Checkbox from './Checkbox';
import '../stylesheets/CheckboxList.css';

const CheckboxList = ({checkboxList, title, className, titleClassName, onClick}) => {
    var checkboxArray = [];
    for(var key in checkboxList)
        checkboxArray.push({name: key, value: key, label: key, checked: (checkboxList[key]) ? 'checked' : ''});
    return(
        <div className = {className}>
            <div className = {titleClassName}>{title + ':'}</div>
            {checkboxArray.map((type, i) => 
                <Checkbox key={i} checkbox={type} onClick={onClick} />
            )}
        </div>
    )
}
export default CheckboxList