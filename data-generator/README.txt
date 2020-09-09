data-generator for VPT project
================================================
implemented using Qt 5.14.0/C++

Functionality:
- generates a set of objects
- fill their respective values into the cells
- creates raw volumetric data file

Settings accessible in generateData() method
w, h, d - dimensions of the grid
targetCount - desired amount of objects (should be some reasonable number since the objects are placed randomly into not occupied space)
canOverlap - if the collision check should be performed
outputType - 0=one byte per cell, 1=four bytes per cell (agreed format)
allowedTypes - add/remove from the list according to desired geometry [1-sphere, 2-ellipsoid, 3-box]

Four bytes file format
- 1st byte:
 [7-6] bits = type of the object (sphere, ellipsoid, box)
 [5-3] bits = 8 classes of size
 [2-0] bits = 8 classes of orientations
- 2nd byte is ID of the object
- 3rd byte is a value
- 4th byte for padding (zeros)
