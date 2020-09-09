#pragma once

#include <QString>
#include <QList>

class Settings {
public:
	int x, y, z;
	int targetCount;
	QString targetFile;
	QList<int> allowedTypes;
	bool canOverlap;

	Settings() {
		allowedTypes.append(1);
		allowedTypes.append(2);
		allowedTypes.append(3);

		canOverlap = false;
	}
};
