#ifndef ELLIPSOID_H
#define ELLIPSOID_H

#include <QVector3D>
#include <QDebug>
#include <QQuaternion>
#include <QSizeF>

#include "Object.h"

class Ellipsoid : public Object {

public:
    Ellipsoid(int id, QVector3D position, uchar value, uchar size, uchar orientation)
        : Object(id, "Ellipsoid", 2, position, value, size, orientation) {
        switch(size) {
            case 0:
                this->_size = QVector3D(0.02f, 0.05f, 0.03f);
                break;
            case 1:
                this->_size = QVector3D(0.07f, 0.08f, 0.04f);
                break;
            case 2:
                this->_size = QVector3D(0.08f, 0.02f, 0.04f);
                break;
            case 3:
                this->_size = QVector3D(0.05f, 0.2f, 0.07f);
                break;
            case 4:
                this->_size = QVector3D(0.02f, 0.1f, 0.03f);
                break;
            case 5:
                this->_size = QVector3D(0.05f, 0.12f, 0.03f);
                break;
            case 6:
                this->_size = QVector3D(0.07f, 0.16f, 0.07f);
                break;
            case 7:
                this->_size = QVector3D(0.07f, 0.08f, 0.1f);
                break;
        }
    }
    //inline QSizeF getDimensions() { return _size; }

    inline bool contains(QVector3D point) override {
        auto tp = point - this->_position;
        tp = this->_rotation.inverted().rotatedVector(tp);
        tp += this->_position;


        float a = ((point.x() - this->_position.x()) / this->_size.x());
        float b = ((point.y() - this->_position.y()) / this->_size.y());
        float c = ((point.z() - this->_position.z()) / this->_size.z());

        return ((a*a) + (b*b) + (c*c)) < 1;
    }

    inline QList<QVector3D> getBoundingBox() override {
        QList<QVector3D> list;

        list.append(this->_position + QVector3D(this->_size.x(), 0, 0));
        list.append(this->_position - QVector3D(this->_size.x(), 0, 0));
        list.append(this->_position + QVector3D(0, this->_size.y(), 0));
        list.append(this->_position - QVector3D(0, this->_size.y(), 0));
        list.append(this->_position + QVector3D(0, 0, this->_size.z()));
        list.append(this->_position - QVector3D(0, 0, this->_size.z()));

        return list;
    }

    inline float getVolume() override {
        return (4.0 / 3.0) * M_PI * (this->_size.x() * this->_size.y() * this->_size.z());
    }
};

#endif // ELLIPSOID_H
