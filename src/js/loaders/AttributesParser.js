// #package js/main

class AttributesParser {

    constructor() {

    }

    getValuesByAttributeName(attribName, layout, attributes) {
        var index = this.getIndexOfAttribute(attribName, layout);    
        
        return this.parseValuesFromAttributeRawFile(index, layout.length, attributes);
    }
    
    getIndexOfAttribute(attribName, layout) {
        if(!layout) {
            return -1;
        }
    
        // get the index if the attribute
        var index = 0;
        for (; index < layout.length; index++) {
            if(layout[index].name == attribName) {
                break;
            }
        }
        return index;
    }
    
    parseValuesFromAttributeRawFile(index, valuesPerRow, attributes, littleEndian = true) {
        if(index < 0 || index >= valuesPerRow) {
            return [];
        }
    
        const view = new DataView(attributes);    
        var count = attributes.byteLength / 4; // converting to float32
        
        var data = [];
        for(var i = index; i < count; i += valuesPerRow) {    
            data.push(view.getFloat32(i * 4, littleEndian));
        }
        
        return data;
    }
    
    getInstanceNumberFromRawFile(attributes,layout) {
        return Math.floor(attributes.byteLength/(4*layout.length));
    }
}