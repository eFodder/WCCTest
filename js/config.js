// Basic map configuration, image url and outer bounds (lat/long) of image
var config = {
	mapImage:'img/civic_center.png',
	topLat:-41.288355,
	botLat:-41.289295,
	leftLong:174.776200,
	rightLong:174.778355
};

// This holds most of the dynamic knowledge about the map, ie the width, ratios etc
var position = {}

// Obviously this holds a collection of the hotspots currently active on the map
var mapHotspots = [];

var debug = {
	isDebug:false,
	latitude:-41.288789,
	longitude:174.777541
};