#include <QVector3D>
#include <QVector4D>
#include <QFile>
#include <QDir>
#include <QtMath>
#include <QDebug>
#include <QDateTime>
#include <QFileInfo>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QDataStream>
#include <stdint.h>

#include "Object.h"
#include "Sphere.h"
#include "Box.h"
#include "Ellipsoid.h"
#include "Settings.h"
#include "Collisions.h"

/* test
QList<Object*> generateObjectsGrid(Settings* set)
{
    QList<Object*> objects;

    float partX = 1.0f / set->x;
    float partY = 1.0f / set->y;
    float partZ = 1.0f / set->z;

    //auto center = QVector3D(0.5f, 0.5f, 0.5f);
    //Object* obj = new Sphere(objects.size(), center, objects.size(), 8, 1);
    //objects.push_back(obj);

    for(int x = 0; x < set->x; x += 42) {
        for(int y = 0; y < set->y; y += 42) {
            for(int z = 0; z < set->z; z += 42) {

                if(((x + y + z) % 2) == 1) {
                    continue;
                }

                //if((x > set->w * 0.25 && x < set->w * 0.75) &&
                //(y > set->h * 0.25 && y < set->h * 0.75) &&
                //(z > set->d * 0.25 && z < set->d * 0.75)){
                //    continue;
                //}

                auto center = QVector3D(x * partX + partX * 0.5f, y * partY + partY * 0.5f, z * partZ + partZ * 0.5f);
                Object* obj = new Box(objects.size(), center, objects.size(), 1, 1);

                bool collision = false;                
                //for(int i = 0; i < objects.size(); i++) {
                //    if(Collisions::intersect(obj, objects[i])) {
                //        collision = true;
                //        break;
                //    }
                //}

                if(!collision) {
                    objects.push_back(obj);
                }
            }
        }
    }

    return objects;
}
*/

QList<Object*> generateObjects(Settings* set)
{
    // initialization of the seed
    // comment this line out if you want the very same random generator everytime!
    qsrand(QDateTime::currentMSecsSinceEpoch() / 1000);

    // generate a bunch of objects
    QList<Object*> objects;

    auto middle = new Sphere(1, QVector3D(0.5, 0.5, 0.5), 1, 8, 5);
    objects.push_back(middle);

    while(objects.size() < set->targetCount) {
        // random position
        float x = (qrand() % 100) * 0.01f;
        float y = (qrand() % 100) * 0.01f;
        float z = (qrand() % 100) * 0.01f;

        uchar type = set->allowedTypes[qrand() % set->allowedTypes.size()];
        uchar size = qrand() % 8; // 8 possible size classes
        uchar orientation = qrand() % 8; // 8 possible orientations        
        int id = objects.size() + 1;
        uchar value = id;

        Object* obj = nullptr;
        switch (type) {
            case 1:
                obj = new Sphere(id, QVector3D(x, y, z), value, size, orientation);
                break;
            case 2:
                obj = new Ellipsoid(id, QVector3D(x, y, x), value, size, orientation);
                break;
            case 3:
                obj = new Box(id, QVector3D(x,y,z), value, size, orientation);
                break;
        }

        // check the collision
        bool collision = false;
        if(!set->canOverlap) {
            for(int i = 0; i < objects.size(); i++) {
                if(Collisions::intersect(obj, objects[i])) {
                    collision = true;
                    break;
                }
            }
        }

        if(set->canOverlap || !collision) {
            objects.append(obj);

            qDebug() << obj->getName() << " " << obj->getPosition() << " " << obj->getSize();
        } else {
            delete obj;
        }
    }

    qDebug() << objects.size() << " objects generated";

    return objects;
}


int indexFromPos(Settings* set, int x, int y, int z) 
{
    return z + y * set->z + x * set->z * set->y;
}

void posFromIndex(int i, Settings* set, int& x, int& y, int& z)
{
    x = i / (set->y * set->z);
    y = (i / set->z) % set->y;
    z = i % set->z;
}

QList<int> getNeighbors(QList<int>* neighs, Settings* set, int x, int y, int z)
{      
    QList<int> indices;
    for (int nx = x - 1; nx <= x + 1; nx++) {
        for (int ny = y - 1; ny <= y + 1; ny++) {
            for (int nz = z - 1; nz <= z + 1; nz++) {
                if (nx < 0 || nx >= set->x) {
                    continue;
                }

                if (ny < 0 || ny >= set->y) {
                    continue;
                }

                if (nz < 0 || nz >= set->z) {
                    continue;
                }

                indices.append(indexFromPos(set, nx, ny, nz));
            }
        }
    }

    return indices;
}

float shortestDistanceToEmptyVoxel(QList<int>* data, Settings* set, int i) {
    int x, y, z;
    posFromIndex(i, set, x, y, z);

    float partX = 1.0f / set->x;
    float partY = 1.0f / set->y;
    float partZ = 1.0f / set->z;

    auto center = QVector3D(x * partX + partX * 0.5f, y * partY + partY * 0.5f, z * partZ + partZ * 0.5f);

    float frequency1 = 30.0;
    float frequency2 = 13.3;
    float value = 0;
    if ((*data)[i] != 0) {
        value += (qSin(center.x() * frequency1) * qSin(center.y() * frequency1) * qSin(center.z() * frequency1)) * 0.5 + 0.5;
        value += (qSin(center.x() * frequency2) * qSin(center.y() * frequency2) * qSin(center.z() * frequency2)) * 0.5 + 0.5;
    }
    value = value * 0.5;

    float noise = 0;//(rand() % RAND_MAX) / (float)RAND_MAX;

    //float final = (value * 0.8 + noise * 0.2) * 256;
    float final = value * 256;
    //qDebug() << final;
    return final;
}

void generateData(QList<Object*> objects, Settings* set, QByteArray* data, QByteArray* data2)
{
    // generate the data as a byte array
    float partX = 1.0f / set->x;
    float partY = 1.0f / set->y;
    float partZ = 1.0f / set->z;

    QDataStream out(data, QIODevice::OpenModeFlag::WriteOnly);    
    out.setFloatingPointPrecision(QDataStream::SinglePrecision);
    out.setByteOrder(QDataStream::LittleEndian);       

    // rasterizing grid
    int count = set->z * set->x * set->y;
    QList<int> array;    
    
    Object* latest = nullptr;
    for(int z = 0; z < set->z; z++) {
        for(int x = 0; x < set->x; x++) {
            for(int y = 0; y < set->y; y++) {
                auto center = QVector3D(x * partX + partX * 0.5f, y * partY + partY * 0.5f, z * partZ + partZ * 0.5f);

                Object* obj = latest;

                if(obj != nullptr && obj->contains(center)) {
                    // speeding up ... don't have to go through all the objects again
                } else {
                    obj = nullptr;
                    for(int i = 0; i < objects.size(); i++) {
                        if(objects[i]->contains(center)) {
                            obj = objects[i];
                            break;
                        }
                    }
                    latest = obj;
                }

                
                if (obj != nullptr) {
                    out << (int)obj->getId();
                    array.append((int)obj->getId());
                }
                else {
                    out << (int)0;
                    array.append(0);                    
                }                

                /*
                * OBSOLETE: ONLY ONE OUTPUT TYPE REMAINED
                * uchar meta = 0;
                if(obj != nullptr) {

                    //qDebug() << "type: " << obj->getType();
                    //qDebug() << "size: " << obj->getSize();
                    //qDebug() << "orientation: " << obj->getOrientation();

                    meta = obj->getOrientation();
                    meta |= ((uchar)obj->getSize() << 3);
                    meta |= ((uchar)obj->getType() << 6);

                    //qDebug() << "meta: " << meta;

                    switch(set->outputType) {
                        case 0:
                            //data.push_back(obj->getValue());

                            out << obj->getValue();
                            break;
                        case 1:
                            //data.push_back(meta);
                            //data.push_back(obj->getId());
                            //data.push_back(obj->getValue());
                            //data.push_back((char)0); // padding

                            out << meta;
                            out << obj->getId();
                            out << obj->getValue();
                            out << (uchar)0;
                            break;
                        case 2:
                            out << (float)obj->getType();
                            out << (float)obj->getSize();
                            out << (float)obj->getOrientation();
                            out << (float)obj->getId();
                            out << (float)obj->getValue();
                            break;
                        case 3:
                            out << (int)obj->getId();
                            break;
                    }
                } else {
                    switch(set->outputType) {
                        case 0:
                            //data.push_back(meta);

                            out << meta;
                        break;
                        case 1:
                            for(int i = 0; i < 4; i++) {
                                //data.push_back(meta);

                                out << meta;
                            }
                        break;
                        case 2:
                            for(int i = 0; i < 5; i++) {
                                out << (float)meta;
                            }
                            break;
                        case 3:
                            out << (int)meta;
                            break;
                    }
                }
                */
            }
        }
        qDebug() << "slice #" << z;
    }


    // distance to the closest empty voxel
    QDataStream out2(data2, QIODevice::OpenModeFlag::WriteOnly);
    out2.setFloatingPointPrecision(QDataStream::SinglePrecision);
    out2.setByteOrder(QDataStream::LittleEndian);

    qDebug() << "shortest distance computation";
    QList<int> dump;
    for (int i = 0; i < array.size(); i++) {
        
        float dist = shortestDistanceToEmptyVoxel(&array, set, i);

        dump.append((uint8_t)(dist));
        out2 << (uint8_t)(dist);

        if (i % (int)(array.size() * 0.1) == 0) {
            qDebug() << i << " voxels done";
        }
    }
}

/*
* OBSOLETE: not used anymore
QJsonObject computeStats(QList<Object*> objects)
{
    QJsonObject stats;
    QJsonObject global;
    QJsonObject elements;

    QJsonObject type;
    int tsc = 0, tbc = 0, tec = 0;

    QJsonObject size;
    int sc[8];
    int tssc[8], tbsc[8], tesc[8];

    QJsonObject orientation;
    int oc[8];
    int tsoc[8], tboc[8], teoc[8];

    for(int i = 0; i < 8; i++) {
        sc[i] = oc[i] = 0;
        tssc[i] = tbsc[i] = tesc[i] = 0;
        tsoc[i] = tboc[i] = teoc[i] = 0;
    }

    for(auto o : objects) {
        switch(o->getType()) {
            case 1:
                tsc++;
                tsoc[o->getOrientation()]++;
                tssc[o->getSize()]++;
                break;
            case 2:
                tbc++;
                tboc[o->getOrientation()]++;
                tbsc[o->getSize()]++;
                break;
            case 3:
                tec++;
                teoc[o->getOrientation()]++;
                tesc[o->getSize()]++;
                break;
        }

        oc[o->getOrientation()]++;
        sc[o->getSize()]++;
    }

    type["Sphere"] = tsc;
    type["Box"] = tbc;
    type["Ellipsoid"] = tec;
    global["Type"] = type;

    for(int i = 0; i < 8; i++) {
        size["Class " + QString::number(i + 1)] = sc[i];
    }
    global["Size"] = size;

    orientation["Random"] = oc[0];
    orientation["Front"] = oc[1];
    orientation["Left"] = oc[2];
    orientation["Up"] = oc[3];
    orientation["Down"] = oc[4];
    orientation["Back"] = oc[5];
    orientation["Diagonal"] = oc[6];
    orientation["InverseDiagonal"] = oc[7];
    global["Orientation"] = orientation;

    stats["global"] = global;

    QJsonObject typeS, typeB, typeE;
    QJsonObject sizeS, sizeB, sizeE;
    QJsonObject orientationS, orientationB, orientationE;

    // sphere
    for(int i = 0; i < 8; i++) {
        sizeS["Class " + QString::number(i + 1)] = tssc[i];
    }

    orientationS["Random"] = tsoc[0];
    orientationS["Front"] = tsoc[1];
    orientationS["Left"] = tsoc[2];
    orientationS["Up"] = tsoc[3];
    orientationS["Down"] = tsoc[4];
    orientationS["Back"] = tsoc[5];
    orientationS["Diagonal"] = tsoc[6];
    orientationS["InverseDiagonal"] = tsoc[7];

    typeS["Size"] = sizeS;
    typeS["Orientation"] = orientationS;

    elements["Sphere"] = typeS;

    // box
    for(int i = 0; i < 8; i++) {
        sizeB["Class " + QString::number(i + 1)] = tbsc[i];
    }

    orientationB["Random"] = tboc[0];
    orientationB["Front"] = tboc[1];
    orientationB["Left"] = tboc[2];
    orientationB["Up"] = tboc[3];
    orientationB["Down"] = tboc[4];
    orientationB["Back"] = tboc[5];
    orientationB["Diagonal"] = tboc[6];
    orientationB["InverseDiagonal"] = tboc[7];

    typeB["Size"] = sizeB;
    typeB["Orientation"] = orientationB;

    elements["Box"] = typeB;

    // ellipsoid
    for(int i = 0; i < 8; i++) {
        sizeE["Class " + QString::number(i + 1)] = tesc[i];
    }

    orientationE["Random"] = teoc[0];
    orientationE["Front"] = teoc[1];
    orientationE["Left"] = teoc[2];
    orientationE["Up"] = teoc[3];
    orientationE["Down"] = teoc[4];
    orientationE["Back"] = teoc[5];
    orientationE["Diagonal"] = teoc[6];
    orientationE["InverseDiagonal"] = teoc[7];

    typeE["Size"] = sizeE;
    typeE["Orientation"] = orientationE;

    elements["Ellipsoid"] = typeE;

    stats["elements"] = elements;

    return stats;
}
*/

void generateCSV(QList<Object*> objects, Settings* set)
{
    qDebug() << "writing attributes\n";

    set->targetFile = "output/attributes.csv";
    QFile csvFile(set->targetFile);

    QString separator = ",";

    if(csvFile.open(QIODevice::WriteOnly)) {
        QTextStream out(&csvFile);

        // header
        out << "Id" << separator;
        out << "Type" << separator;
        out << "Width" << separator;
        out << "Height" << separator;
        out << "Depth" << separator;
        out << "Orientation" << separator;
        out << "X" << separator;
        out << "Y" << separator;
        out << "Z" << separator;
        out << "Volume";
        out << "\r\n";


        for(auto o : objects) {
            out << o->getId() << separator;
            out << o->getType() << separator;
            out << o->getSize3D().x() << separator;
            out << o->getSize3D().y() << separator;
            out << o->getSize3D().z() << separator;
            out << o->getOrientation() << separator;
            out << o->getPosition().x() << separator;
            out << o->getPosition().y() << separator;
            out << o->getPosition().z() << separator;
            out << o->getVolume() * 1000;
            out << "\r\n";
        }

        csvFile.close();
    }

    set->targetFile = "output/attributes.raw";
    QFile rawFile(set->targetFile);

    if(rawFile.open(QIODevice::WriteOnly)) {
        QDataStream out(&rawFile);
        out.setFloatingPointPrecision(QDataStream::FloatingPointPrecision::SinglePrecision);
        out.setByteOrder(QDataStream::LittleEndian);

        // output attributes for background
        for (int i = 0; i < 10; i++) {
            out << (float)0;
        }

        for(auto o : objects) {
            out << (float)o->getId();
            out << (float)o->getType();
            out << (float)o->getSize3D().x();
            out << (float)o->getSize3D().y();
            out << (float)o->getSize3D().z();
            out << (float)o->getOrientation();
            out << (float)(o->getPosition().x());
            out << (float)(o->getPosition().y());
            out << (float)(o->getPosition().z());
            out << (float)(o->getVolume() * 1000);
        }

        csvFile.close();
    }
}

QByteArray generateMeta(QList<Object*> objects, Settings* set)
{
    QJsonObject root;

   /* QJsonObject general;
    general["info"] = "Binary file contains synthetic volumetric data for VPT renderer.";
    general["width"] = set->x;
    general["height"] = set->y;
    general["depth"] = set->z;
    general["bits"] = 32;*/

    /* OBSOLETE, ONLY ONE TYPE REMAINED
    switch(set->outputType) {
        case 0:
            general["bits"] = 8;
            break;
        case 1:
            general["bits"] = 32;
            break;
        case 2:
            general["bits"] = 160;
            break;
        case 3:
            general["bits"] = 32;
            break;
    }
    */

    //general["particles"] = set->targetCount;

    //root["general"] = general;
    //root["stats"] = computeStats(objects);

    QJsonArray layout, values, valuesS, valuesO, layoutH;
    QJsonObject value, header, type, size, orientation, id, padding;

    //root["layout"] = layout;    

    value["name"] = "Id";
    value["type"] = "float";
    layout.append(value);

    value["name"] = "Type";
    value["type"] = "float";
    layout.append(value);

    value["name"] = "Width";
    value["type"] = "float";
    layout.append(value);

    value["name"] = "Height";
    value["type"] = "float";
    layout.append(value);

    value["name"] = "Depth";
    value["type"] = "float";
    layout.append(value);

    value["name"] = "Orientation";
    value["type"] = "float";
    layout.append(value);

    value["name"] = "X";
    value["type"] = "float";
    layout.append(value);

    value["name"] = "Y";
    value["type"] = "float";
    layout.append(value);

    value["name"] = "Z";
    value["type"] = "float";
    layout.append(value);

    value["name"] = "Volume";
    value["type"] = "float";
    layout.append(value);

    QJsonDocument doc(layout);
    return doc.toJson();

    /*OBSOLETE: ONLY ONE OUTPUT TYPE REMAINED
    switch(set->outputType) {
        case 0:
            value["name"] = "Value";
            value["bits"] = 8;
            value["datatype"] = "byte";
            value["desc"] = "Value of the element presented in the current cell.";
            layout.append(value);
            break;
        case 1:
            header["name"] = "Header";
            header["bits"] = 8;
            header["datatype"] = "complex";
            header["desc"] = "Header byte of a cell.";

            type["name"] = "Type";
            type["bits"] = 2;
            type["datatype"] = "enum";
            type["desc"] = "Type of the element";
            values.append("Undefined");
            values.append("Sphere");
            values.append("Ellipsoid");
            values.append("Box");
            type["values"] = values;

            size["name"] = "Size";
            size["bits"] = 3;
            size["datatype"] = "enum";
            size["desc"] = "Size of the element";
            valuesS.append("Class 1");
            valuesS.append("Class 2");
            valuesS.append("Class 3");
            valuesS.append("Class 4");
            valuesS.append("Class 5");
            valuesS.append("Class 6");
            valuesS.append("Class 7");
            valuesS.append("Class 8");
            size["values"] = valuesS;

            orientation["name"] = "Orientation";
            orientation["bits"] = 3;
            orientation["datatype"] = "enum";
            orientation["desc"] = "Orientation of the element";
            valuesO.append("Random");
            valuesO.append("Front");
            valuesO.append("Left");
            valuesO.append("Up");
            valuesO.append("Down");
            valuesO.append("Back");
            valuesO.append("Diagonal");
            valuesO.append("InverseDiagonal");
            orientation["values"] = valuesO;

            layoutH.append(type);
            layoutH.append(size);
            layoutH.append(orientation);
            header["layout"] = layoutH;

            layout.append(header);

            id["name"] = "ID";
            id["bits"] = 8;
            id["datatype"] = "byte";
            id["desc"] = "ID of the element presented in the current cell.";
            layout.append(id);

            value["name"] = "Value";
            value["bits"] = 8;
            value["datatype"] = "byte";
            value["desc"] = "Value of the element presented in the current cell.";
            layout.append(value);

            padding["name"] = "Padding";
            padding["bits"] = 8;
            padding["datatype"] = "byte";
            padding["desc"] = "Zeros used for padding.";
            layout.append(padding);
        break;
        case 2:
            type["name"] = "Type";
            type["bits"] = 32;
            type["datatype"] = "float";
            type["desc"] = "Type of the element";
            values.append("Undefined");
            values.append("Sphere");
            values.append("Ellipsoid");
            values.append("Box");
            type["values"] = values;

            size["name"] = "Size";
            size["bits"] = 32;
            size["datatype"] = "float";
            size["desc"] = "Size of the element";
            valuesS.append("Class 1");
            valuesS.append("Class 2");
            valuesS.append("Class 3");
            valuesS.append("Class 4");
            valuesS.append("Class 5");
            valuesS.append("Class 6");
            valuesS.append("Class 7");
            valuesS.append("Class 8");
            size["values"] = valuesS;

            orientation["name"] = "Orientation";
            orientation["bits"] = 32;
            orientation["datatype"] = "float";
            orientation["desc"] = "Orientation of the element";
            valuesO.append("Random");
            valuesO.append("Front");
            valuesO.append("Left");
            valuesO.append("Up");
            valuesO.append("Down");
            valuesO.append("Back");
            valuesO.append("Diagonal");
            valuesO.append("InverseDiagonal");
            orientation["values"] = valuesO;

            layout.append(type);
            layout.append(size);
            layout.append(orientation);

            id["name"] = "ID";
            id["bits"] = 32;
            id["datatype"] = "float";
            id["desc"] = "ID of the element presented in the current cell.";
            layout.append(id);

            value["name"] = "Value";
            value["bits"] = 32;
            value["datatype"] = "float";
            value["desc"] = "Value of the element presented in the current cell.";
            layout.append(value);
        break;       
    }
    */    

    //QJsonDocument doc(root);
    //return doc.toJson();
}

void writeData(QByteArray data, Settings* set) {

    // write data into the file

    QFile file(set->targetFile);

    qDebug() << "written to: " << QFileInfo(file).absoluteFilePath();

    if(file.open(QIODevice::WriteOnly)) {
        file.write(data);
        file.close();
    }
}

int main(int argc, char *argv[])
{
    // setting of the generator
    Settings set;
    /*set.w = 128;
    set.h = 128;
    set.d = 128;*/
    set.x = 256;
    set.y = 256;
    set.z = 256;
    set.targetCount = 1000;
    //set.outputType = 3;

    // main data generator
    QList<Object*> objects = generateObjects(&set);
    //QList<Object*> objects = generateObjectsGrid(&set);
    qDebug() << objects.size();
    
    auto current = QDir::current();
    QDir dir(current.absolutePath() + "/output");
    if (!dir.exists()) {
        dir.mkdir(current.absolutePath() + "/output");
    }

    QByteArray volume1, volume2;
    generateData(objects, &set, &volume1, &volume2);
    set.targetFile = "output/data.raw";
    writeData(volume1, &set);    
    set.targetFile = "output/data_distances.raw";
    writeData(volume2, &set);

    // ONLY ONE OUTPUT TYPE REMAINED
    // meta file descriptor
    //if(set.outputType == 3) {
        generateCSV(objects, &set);
    //} else {
        auto data = generateMeta(objects, &set);
        set.targetFile = "output/data.json";
        writeData(data, &set);
    //}

    return 0;
}
