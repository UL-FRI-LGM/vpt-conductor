#ifndef OBJECT_H
#define OBJECT_H

#include <QVector3D>
#include <QDebug>
#include <QQuaternion>
#include <QSizeF>

class Object {
protected:
    QVector3D _position;
    QQuaternion _rotation;
    QVector3D _size;

    int _id;
    uchar _value;
    uchar _type; // 0=undefined, 1=sphere, 2=ellipsoid, 3=box
    uchar _sizeT; // 8 size classes
    uchar _orientation; // 8 possible orientations

    QString _name;
public:
    Object(int id, QString name, uchar type, QVector3D position, uchar value, uchar size, uchar orientation) {
        this->_id = id;
        this->_position = position;
        this->_value = value;
        this->_type = type;
        this->_orientation = orientation;
        this->_sizeT = size;
        this->_name = name;

        switch(orientation) {
            default:
            case 0: // random rotation
                this->_rotation = QQuaternion::fromEulerAngles(qrand() % 360 - 180, qrand() % 360 - 180, qrand() % 360 - 180);
                break;
            case 1: // no rotation // front - yaw
                this->_rotation = QQuaternion::fromEulerAngles(0, 0, 0);
                break;
            case 2: // left - roll
                this->_rotation = QQuaternion::fromEulerAngles(0, 0, 90);
                break;
            case 3: // up - pitch
                this->_rotation = QQuaternion::fromEulerAngles(90, 0, 0);
                break;
            case 4: // down - pitch
                this->_rotation = QQuaternion::fromEulerAngles(-90, 0, 0);
                break;
            case 5: // back - yaw
                this->_rotation = QQuaternion::fromEulerAngles(0, -180, 0);
                break;
            case 6: // diagonal
                this->_rotation = QQuaternion::fromEulerAngles(45, 45, 45);
                break;
            case 7: // inverse diagonal
                this->_rotation = QQuaternion::fromEulerAngles(-45, -45, -45);
                break;
        }
    }

    inline QVector3D getPosition() { return _position; }
    inline QQuaternion getRotation() { return _rotation; } // probably not useful
    inline QVector3D getSize3D() { return _size; }

    // for volumetric data
    inline int getId() { return _id; }
    inline uchar getValue() { return _value; }
    inline uchar getType() { return _type; }
    inline uchar getSize() { return _sizeT; }
    inline uchar getOrientation() { return _orientation; }
    inline QString getName() { return this->_name; }
    
    virtual bool contains(QVector3D point) = 0;
    virtual QList<QVector3D> getBoundingBox() = 0;
    virtual float getVolume() = 0;
};
// ===================================

#endif // OBJECT_H
