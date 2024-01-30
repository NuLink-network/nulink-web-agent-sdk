/**
 * Check if an object is empty
* @param value 
 */
 function isBlank(value: any): boolean {
    if (value === null || value === undefined || value === "") {
        return true;
    }
    return false;
}

/**
 * Check if a property of an object is empty
 * @param obj 
 */
 const isNotEmptyObject = (obj: any): boolean => {
    if (typeof obj === "object") {
        if (Object.keys(obj).length > 0) {
            return true;
        }
    }
    return false;
}

/**
 * Check if an object is empty
 * @param value 
 */
 function isNotBlankAndEmptyObject(value: any): boolean {
    if (value === null || value === undefined || value === "") {
        return false;
    }
    if (isNotEmptyObject(value)) {
        return true;
    } else {
        return false;
    }
}
/**
 * Check if all attribute values of an object are empty
 * @param value 
 */
function isAllEmptyValue(value: any): boolean {
    // Returns true if the object is empty
    if (isBlank(value)) {
        return true;
    }
    if (typeof value === "object") {
        if (Object.keys(value).every(item => isBlank(value[item]))) {
            return true;
        } else {
            return false;
        }
    } else {
        return true;
    }
}

export  {isBlank, isNotEmptyObject, isNotBlankAndEmptyObject, isAllEmptyValue}