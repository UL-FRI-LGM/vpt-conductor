#ifndef COLLISIONS_H
#define COLLISIONS_H

#include <QVector3D>
#include <QtMath>

#include "Object.h"
#include "Sphere.h"
#include "Ellipsoid.h"
#include "Box.h"

class Collisions
{
public:
    // this is very lame collision detection but is enough for now
    static bool intersect(Object* o1, Object* o2)
    {
        for(auto p : o1->getBoundingBox()) {
            if(o2->contains(p)) {
                return true;
            }
        }

        for(auto p : o2->getBoundingBox()) {
            if(o1->contains(p)) {
                return true;
            }
        }

        return false;
    }
};


#endif // COLLISIONS_H
