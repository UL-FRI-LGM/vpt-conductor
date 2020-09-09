#ifndef BOX_H
#define BOX_H

#include <QVector3D>
#include <QDebug>
#include <QQuaternion>
#include <QSizeF>

#include "Object.h"

class Box : public Object {

public:
    Box(int id, QVector3D position, uchar value, uchar size, uchar orientation)
        : Object(id, "Box", 3, position, value, size, orientation) {

        switch(size) {
            case 0:
                this->_size = QVector3D(0.05f, 0.03f, 0.06f);
                break;
            case 1:
                this->_size = QVector3D(0.03f, 0.04f, 0.05f);
                break;
            case 2:
                this->_size = QVector3D(0.04f, 0.1f, 0.03f);
                break;
            case 3:
                this->_size = QVector3D(0.02f, 0.08f, 0.05f);
                break;
            case 4:
                this->_size = QVector3D(0.03f, 0.06f, 0.09f);
                break;
            case 5:
                this->_size = QVector3D(0.11f, 0.05f, 0.04f);
                break;
            case 6:
                this->_size = QVector3D(0.04f, 0.06f, 0.04f);
                break;
            case 7:
                this->_size = QVector3D(0.05f, 0.12f, 0.2f);
                break;
            case 8:
                this->_size = QVector3D(0.33f, 0.33f, 0.33f);
                break;
        }
    }
    //inline QVector3D getDimensions() { return _size; }

    inline bool contains(QVector3D point) override {

        auto tp = point - this->_position;
        tp = this->_rotation.inverted().rotatedVector(tp);
        tp += this->_position;

        float xmin = this->_position.x() - this->_size.x() * 0.5f;
        float xmax = this->_position.x() + this->_size.x() * 0.5f;
        float ymin = this->_position.y() - this->_size.y() * 0.5f;
        float ymax = this->_position.y() + this->_size.y() * 0.5f;
        float zmin = this->_position.z() - this->_size.z() * 0.5f;
        float zmax = this->_position.z() + this->_size.z() * 0.5f;

        return xmin <= tp.x() && tp.x() <= xmax &&
               ymin <= tp.y() && tp.y() <= ymax &&
               zmin <= tp.z() && tp.z() <= zmax;
    }

    inline QList<QVector3D> getBoundingBox() override {
        QList<QVector3D> list;

        float xmin = this->_position.x() - this->_size.x() * 0.5f;
        float xmax = this->_position.x() + this->_size.x() * 0.5f;
        float ymin = this->_position.y() - this->_size.y() * 0.5f;
        float ymax = this->_position.y() + this->_size.y() * 0.5f;
        float zmin = this->_position.z() - this->_size.z() * 0.5f;
        float zmax = this->_position.z() + this->_size.z() * 0.5f;

        list.append(this->_rotation.rotatedVector(QVector3D(xmin, ymin, zmin)));
        list.append(this->_rotation.rotatedVector(QVector3D(xmax, ymin, zmin)));
        list.append(this->_rotation.rotatedVector(QVector3D(xmax, ymin, zmax)));
        list.append(this->_rotation.rotatedVector(QVector3D(xmin, ymin, zmax)));
        list.append(this->_rotation.rotatedVector(QVector3D(xmin, ymax, zmin)));
        list.append(this->_rotation.rotatedVector(QVector3D(xmax, ymax, zmin)));
        list.append(this->_rotation.rotatedVector(QVector3D(xmax, ymax, zmax)));
        list.append(this->_rotation.rotatedVector(QVector3D(xmin, ymax, zmax)));

        return list;
    }

    inline float getVolume() override {
        return this->_size.x() * this->_size.y() * this->_size.z();
    }
};

#endif // BOX_H
