var currentLatitude = 0;
var currentLongitude = 0;
var locationLoaded = false;
var mapSetup = false;
var zoomLevel = 1;

var newHotspot = { points:[] };

// This function fires the phonegap call to actually get the Geoposition - called by setupMap
function getCurrentPosition() {
	if(!debug.isDebug && navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(onPositionSuccess, onPositionError);
	} else {
		// Use debug data - this will need to be changed when it becomes a proper app in which case debug data should not be used unless it has been explicitly set.
		currentLatitude = debug.latitude;
		currentLongitude = debug.longitude;	
		
		locationLoaded = true;
		if (mapSetup) {
			setLatLongRatios();
		}
	}	
}

// This function is fired when the geolocation check is successful - called by getCurrentPosition
function onPositionSuccess(geoPosition) {
	/*$('#location-output').html(
		'Latitude: '           + position.coords.latitude              + '<br />' +
		'Longitude: '          + position.coords.longitude             + '<br />' +
		'Altitude: '           + position.coords.altitude              + '<br />' +
		'Accuracy: '           + position.coords.accuracy              + '<br />' +
		'Altitude Accuracy: '  + position.coords.altitudeAccuracy      + '<br />' +
		'Heading: '            + position.coords.heading               + '<br />' +
		'Speed: '              + position.coords.speed                 + '<br />' +
		'Timestamp: '          + position.timestamp                    + '<br />');*/
	
	currentLatitude = geoPosition.coords.latitude;
	currentLongitude = geoPosition.coords.longitude;
	
	locationLoaded = true;
	if (mapSetup) {
		setLatLongRatios();
	}
}

// This function is fired when the geolocation check is unsuccessful - called by getCurrentPosition
function onPositionError(error) {
	/*$('#location-output').html('Unable to obtain position:<br>' + 
		'code: '    + error.code    + '<br>' +
		'message: ' + error.message + '<br>');*/
	console.log('Unable to obtain position');
	
	//Revert to debug while we are testing
	currentLatitude = debug.latitude;
	currentLongitude = debug.longitude;
	
	locationLoaded = true;
	if (mapSetup) {
		setLatLongRatios();
	}
}

// This function sizes the map to fit the viewport - initially called by setupMap
function resizeMapImage() {
	var img = $('#map-image');
	img.css({  });
	var imageWidth = img.outerWidth();
	var imageHeight = img.outerHeight();
	var imageRatio = imageWidth / imageHeight;
	
	$('#map-outer').css({ 'width':$(window).width()+'px', 'height':$(window).height()+"px", 'overflow':'hidden' });
	// True size variables
	var tWidth = $(window).width();
	var tHeight = $(window).height();
	// Size Constraints of inner panel based on the current zoom level - we will calculate based on these virtual figures.
	var vWidth = $(window).width() * config['zoom'+zoomLevel];
	var vHeight = $(window).height() * config['zoom'+zoomLevel];
	
	if (imageWidth < vWidth) {
		imageWidth = vWidth;
		imageHeight = imageWidth / imageRatio;
	}
	//Ratio based on width
	var ratio = imageWidth / vWidth;
	//Ratio based on height
	if (vHeight < (imageHeight / ratio)) {
		ratio = imageHeight / vHeight;
	}
	
	var newWidth = imageWidth / ratio;
	var newHeight = imageHeight / ratio;
	
	//Calculate positioning information based on the true screen sizes
	var xPos = (tWidth - newWidth) / 2;
	var yPos = (tHeight - newHeight) / 2;
	
	mapdata.xPosition = xPos;
	mapdata.yPosition = yPos;
	mapdata.mapWidth = newWidth;
	mapdata.mapHeight = newHeight;
	
	/*mapdata.zoomX = mapdata.xPosition;
	mapdata.zoomY = mapdata.yPosition;
	mapdata.zoomWidth = mapdata.mapWidth;
	mapdata.zoomHeight = mapdata.mapHeight;*/
	
	$(img).css({ 'width':newWidth, 'height':newHeight, 'position':'relative', 'left':xPos, 'top':yPos });
	
	//Size hotspot holder to match -- we need to do this to catch click events
	$('#hotspot-holder').css({
			'position':'absolute',
			'top':mapdata.yPosition+'px',
			'left':mapdata.xPosition+'px',
			'width':mapdata.mapWidth+'px',
			'height':mapdata.mapHeight+'px'
		});
	
	//Map is setup so we can add the hotspots to it - user position does not affect this
	zoomControls();
	drawHotspots();
	
	mapSetup = true;
	if (locationLoaded){
		setLatLongRatios();
	}
}

// This function converts working lat/long values to positives and calculates ratios - called by setLatLongRatios
function setPositionValues() {
	mapdata.currentLat = Math.abs(currentLatitude);
	mapdata.currentLong = Math.abs(currentLongitude);
	mapdata.topLat = Math.abs(config.topLat);
	mapdata.botLat = Math.abs(config.botLat);
	mapdata.leftLong = Math.abs(config.leftLong);
	mapdata.rightLong = Math.abs(config.rightLong);
	
	mapdata.latRatio = mapdata.mapHeight / (mapdata.botLat - mapdata.topLat);
	mapdata.longRatio = mapdata.mapWidth / (mapdata.rightLong - mapdata.leftLong);	
}

// This function sets the zoom display of the map - called by resizeMapImage
function zoomControls() {
	console.log('Setting zoom control');
	
	//The zoom arrow is floating on the right of the screen, this needs to have boundries (top/bottom) as well as increments to move by
	mapdata.zoomIconHeight = $('.zoom-level').outerHeight();
	mapdata.zoomTop = $('.zoom-in:first').outerHeight();
	mapdata.zoomBot = $(window).height() - $('.zoom-out:first').outerHeight() - mapdata.zoomIconHeight;	
	var zoomable = mapdata.zoomBot - mapdata.zoomTop;
	mapdata.zoomIncrement = zoomable / config.zoomLevels;
	
	console.log(mapdata);
	
	//Current zoomicon position
	var currentZoomPos = mapdata.zoomBot - ((zoomLevel - 1) * mapdata.zoomIncrement);
	$('.zoom-level').css('top',currentZoomPos+'px');
	
}

// This function performs a change in the zoom level, either zooming in one increment (true) or out (false) - called by user clicking the zoom controls
function zoomMapIn(zoomIn) {
	if(zoomIn){
		if (zoomLevel == config.zoomLevels) { return; }
		zoomLevel++;
	} else {
		if (zoomLevel == 1) { return; }
		zoomLevel--;
	}
	
	resizeMapImage();
}

// This function adds the geolocation icon to the map - called by resizeMapImage if location has been loaded, otherwise by onPositionSuccess
function setLatLongRatios() {
	setPositionValues();
	
	if (mapdata.currentLat > mapdata.topLat
			&& mapdata.currentLat < mapdata.botLat
			&& mapdata.currentLong > mapdata.leftLong
			&& mapdata.currentLong < mapdata.rightLong) {
		console.log('within map bounds');
		var iconTop = mapdata.yPosition + 
			((mapdata.currentLat - mapdata.topLat) * mapdata.latRatio) 
			- ($('#currentUserPosition').outerHeight() / 2);
		var iconLeft = mapdata.xPosition + 
			((mapdata.currentLong - mapdata.leftLong) * mapdata.longRatio)
			- ($('#currentUserPosition').outerWidth() / 2);
		console.log('left = '+iconLeft+'\n top = '+iconTop);
		
		// We must have an icon div created in order to position it
		if ($('#currentUserPosition').length == 0) {
			$('#map-inner').append('<div id="currentUserPosition"></div>'); 
		}		
		
		$('#currentUserPosition').css({ 'top':iconTop+'px', 'left':iconLeft+'px'});
	} else {
		console.log('outside of map bounds');
	}
}

// This function draws all hotspots and titles on top of the map - This is currently done with SVG which allows us the style the generated polygons with a greater degree of control unlike image-maps which do not allow for individual styling of components.  - called by closeHotspot and resizeMapImage
function drawHotspots() {
	if (mapHotspots.length > 0) {
		console.log('Drawing Hotspots');
	
		//Currently using SVG as it seems to be the best solution, image maps does not support styling of the individual shapes and am unsure how this would react once we get pinch/zoom added.
		
		//Start with a clean slate
		$('#hotspot-map').remove();	
		$('#hotspot-titles').remove();
		$('#hotspot-content').remove();
		
		
		//Add to the holder, this needs to be done with pure js as jquery does not play nicely
		var container = document.getElementById("hotspot-holder");
		mapSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		mapSvg.setAttribute("version", "1.2");
		mapSvg.setAttribute("baseProfile", "tiny");
		mapSvg.setAttribute("id", "hotspot-map");
		container.appendChild(mapSvg);
		
		//The hotspot titles should be above the areas so this needs to be placed after the svg has been created
		$('#hotspot-holder').append('<div id="hotspot-titles"></div>');
		//The hotspot content popups should display above all other content so this needs to be placed after everything else
		$('#hotspot-holder').append('<div id="hotspot-content"></div>');
		
		$('#hotspot-map').css({
			  'position': 'relative',
			  'width':mapdata.mapWidth+'px',
			  'height':mapdata.mapHeight+'px'
			})
			
		for (var i = 0; i < mapHotspots.length; i++) {
			var hotspot = mapHotspots[i];
			
			var pointString = '';
			//Cycle all points to construct the point string
			$.each(hotspot.points, function(index, point) {
				console.log(point);
				var xPoint = percentageAsPoint(point.xPos,false);
				var yPoint = percentageAsPoint(point.yPos,true);
				if (pointString.length > 0) { pointString += ' '; }
				pointString += xPoint + ',' + yPoint;
			})
			
			// Adding the polygon object through jquery will not work, it will add it to the dom but not the display, this needs to be done with pure js.
			hotspotPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
			hotspotPolygon.setAttribute("id", "hotspot-boundry-"+i);
			hotspotPolygon.setAttribute("class", "hotspot-boundry");
			hotspotPolygon.setAttribute("points", pointString);
			hotspotPolygon.setAttribute("onclick", "$('#hotspot-content-"+i+"').popup(); $('#hotspot-content-"+i+"').css('display','block'); $('#hotspot-content-"+i+"').popup('open');");
			hotspotPolygon.setAttribute("data-rel", "popup");
			mapSvg.appendChild(hotspotPolygon);
			
			//The popup is triggered by jquery mobile through the data-role / data-rel tags.  The divs containing popup content will be placed in a div after all other map data to ensure it is shown on top
			var contentPanel = '<div id="hotspot-content-'+i+'" data-role="popup" class="hotspot-content" data-overlay-theme="a">' +
					'<div class="panel-head">' + hotspot.name + '</div>' +
					'<div class="panel-content">' + hotspot.content + '</div>' +
				'</div>'
			$('#hotspot-content').append(contentPanel);
			
			
			$('#hotspot-titles').append('<div id="hotspot-title-'+i+'" class="hotspot-title">' + hotspot.name + '</div>')
			var boundry = $('#hotspot-boundry-'+i);
			$('#hotspot-title-'+i).css({ 
				'left':boundry.position().left + (boundry[0].getBBox().width / 2) - ($('#hotspot-title-'+i).outerWidth() / 2),
				'top':boundry.position().top + (boundry[0].getBBox().height / 2) - ($('#hotspot-title-'+i).outerHeight() / 2)
			})
		}
			
	} else {
		console.log('No Hotspots to draw');
	}
}

// This function displays the content for individual hotspots - called by the user clicking on a hotspot.
function showHotspotContent(hotspotIndex) {
	
}

//This function finalises the hotspot being created, adds name and content and cleans up the temporary displayed content - called by the user clicking 'Close Hotspot'
function closeHotspot() {
	console.log('Closing Hotspot');
	
    var hotspotName=prompt("Please enter a display name for the new hotspot","hotspot-"+mapHotspots.length);
    if (hotspotName != null){
       var hotspotContent=prompt("Please enter the content for "+hotspotName,"Hotspot Content");
	   if (hotspotContent != null) {
		   //Should now have all the information we need to create a new hotspot, combine it all together and clean up the temporary elements.//
		   newHotspot.name = hotspotName;
		   newHotspot.content = hotspotContent;
		   
		   mapHotspots.push(newHotspot);
		   
		   $('#hotspot-holder').off('click');
		   $('#mappage').css('cursor','auto');
		   $('#point-controls').css('display','none');
		   $('.creatingHS').remove();
		   
		   drawHotspots();		   
	   }
   }
}

//This function adds a hotspot point at the current mouse position. It also draws a line between this point and the next if required
var addPoint = function(e) {
	console.log('Adding Point');
	
	var xPos = pointAsPercentage(event.pageX, false);
	var yPos = pointAsPercentage(event.pageY, true);
	
	//Setup working vals
	var thisId = newHotspot.points.length;
	
	//Add visual representation of point to the map
	var newPoint = $('#map-image').parent().append('<div id="point' + thisId + '" class="new-point creatingHS"></div>');
	var pointRef = $('#point' + thisId);
	var xPoint = percentageAsPoint(xPos,false) + mapdata.xPosition - (pointRef.outerWidth() / 2);
	var yPoint = percentageAsPoint(yPos,true) + mapdata.yPosition - (pointRef.outerHeight() / 2);
	pointRef.css({ 'left':xPoint+'px','top':yPoint+'px' });
	
	var newPointObject = {
		pointId:thisId,
		pageX:event.pageX,
		pageY:event.pageY,
		xPos:xPos,
		yPos:yPos,
		xPoint:xPoint,
		yPoint:yPoint
	};
	newHotspot.points.push(newPointObject);
	
	//Draw line between points
	if (newHotspot.points.length > 1) {
		//Using p1x,p1y,p2x.. to represent point1Xposition, point1YPosition etc. 
		var p1x = newHotspot.points[thisId-1].pageX;
		var p1y = newHotspot.points[thisId-1].pageY;
		var p2x = newHotspot.points[thisId].pageX;
		var p2y = newHotspot.points[thisId].pageY;
		
		console.log(p1x+'-'+p1y+'-'+p2x+'-'+p2y);
		
		//Calculate length, and angle of a line between two points, actually just creates a long thin div and rotates it. - relies on the div having a style of transform-origin: 0 100%; which will ensure that the line rotates from the center of the first point
		var length = Math.sqrt((p1x-p2x)*(p1x-p2x) + (p1y-p2y)*(p1y-p2y));
		var angle  = Math.atan2(p2y - p1y, p2x - p1x) * 180 / Math.PI;
		var transform = 'rotate('+angle+'deg)';
		
		var line = $('<div>')
        .insertBefore('.new-point:first')
        .addClass('map-line')
		.addClass('creatingHS')
        .css({
          'position': 'absolute',
          'transform': transform,
		  'transform-origin':'0 100%',
		  'top':p1y+'px',
		  'left':p1x+'px'
        })
        .width(length);
	}
	
	console.log(newHotspot);
}

//This function calculates a point passed as x/y (of the viewport) into the percentage position on the map - called by addPoint
function pointAsPercentage(point, AsHeight) {
	var thisPos = mapdata.xPosition;
	var size = mapdata.mapWidth;
	
	if (AsHeight) {
		thisPos = mapdata.yPosition;
		size = mapdata.mapHeight;
	}
	
	return (point - thisPos) / (size / 100);
}

//This function converts a map position passed as a percentage into the pixel value of the map - called by addPoint
function percentageAsPoint(percentage, AsHeight) {
	var size = mapdata.mapWidth;
	if (AsHeight) {
		size = mapdata.mapHeight;
	}
	return (size / 100) * percentage;
}

// This function sets up the map for admin work to create a new hotspot - called by user clicking 'Create Hotspot'
function createHotspot() {
	$('#mappage').css('cursor','crosshair');
	toggleMenu();
	
	$('#point-controls').css('display','block');
	
	newHotspot = { points:[] };
	
	$('#hotspot-holder').on('click',addPoint);
}

// Initial function
function setupMap() {
	//Load image	
	$('#map-image').attr('src', config.mapImage);
	// Attempt geolocation fetching
	getCurrentPosition();
	
	$('#map-image').load(resizeMapImage);
	
	$(window).resize(resizeMapImage);
}