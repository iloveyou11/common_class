let cutField = (fieldName, length, data, i) => {
    if (data[i][fieldName] !== null) {
        if (data[i][fieldName].length > length) {
            data[i][fieldName] = data[i][fieldName].slice(0, length) + '……';
        }
    }
};