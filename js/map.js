var currentLatitude = 0;
var currentLongitude = 0;
var locationLoaded = false;
var mapSetup = false;

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
	$('#tmp').append('Unable to obtain position'+'<br>');
	
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
	var imageWidth = img.width();
	var imageHeight = img.height();
	var imageRatio = imageWidth / imageHeight;
	
	if (imageWidth < $(window).width()) {
		imageWidth = $(window).width();
		imageHeight = imageWidth / imageRatio;
	}
	//Ratio based on width
	var ratio = imageWidth / $(window).width();
	//Ratio based on height
	if ($(window).height() < (imageHeight / ratio)) {
		ratio = imageHeight / $(window).height();
	}
	
	var newWidth = imageWidth / ratio;
	var newHeight = imageHeight / ratio;
	
	$(img).attr('width',newWidth);
	$(img).attr('height',newHeight);
	
	var xPos = ($(window).width() - newWidth) / 2;
	var yPos = ($(window).height() - newHeight) / 2;
	
	position.xPosition = xPos;
	position.yPosition = yPos;
	position.mapWidth = newWidth;
	position.mapHeight = newHeight;
	
	$(img).css({'position':'relative','left':xPos,'top':yPos});
	
	//Size hotspot holder to match -- we need to do this to catch click events
	$('#hotspot-holder').css({
			'position':'absolute',
			'top':position.yPosition+'px',
			'left':position.xPosition+'px',
			'width':position.mapWidth+'px',
			'height':position.mapHeight+'px'
		});
	
	//Map is setup so we can add the hotspots to it - user position does not affect this
	drawHotspots();
	
	mapSetup = true;
	if (locationLoaded){
		setLatLongRatios();
	}
}

// This function converts working lat/long values to positives and calculates ratios - called by setLatLongRatios
function setPositionValues() {
	position.currentLat = Math.abs(currentLatitude);
	position.currentLong = Math.abs(currentLongitude);
	position.topLat = Math.abs(config.topLat);
	position.botLat = Math.abs(config.botLat);
	position.leftLong = Math.abs(config.leftLong);
	position.rightLong = Math.abs(config.rightLong);
	
	position.latRatio = position.mapHeight / (position.botLat - position.topLat);
	position.longRatio = position.mapWidth / (position.rightLong - position.leftLong);
	
	console.log(position);
	$('#tmp').append(JSON.stringify(position)+'<br>');
}

// This function adds the geolocation icon to the map - called by resizeMapImage if location has been loaded, otherwise by onPositionSuccess
function setLatLongRatios() {
	setPositionValues();
	
	if (position.currentLat > position.topLat
			&& position.currentLat < position.botLat
			&& position.currentLong > position.leftLong
			&& position.currentLong < position.rightLong) {
		console.log('within map bounds');
		$('#tmp').append('Within map bounds'+'<br>');
		var iconTop = position.yPosition + 
			((position.currentLat - position.topLat) * position.latRatio) 
			- ($('#currentUserPosition').height() / 2);
		var iconLeft = position.xPosition + 
			((position.currentLong - position.leftLong) * position.longRatio)
			- ($('#currentUserPosition').width() / 2);
		console.log('left = '+iconLeft+'\n top = '+iconTop);
		
		// We must have an icon div created in order to position it
		if ($('#currentUserPosition').length == 0) {
			$('#map-outer').append('<div id="currentUserPosition"></div>'); 
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
		
		
		//Add to map-outer to the holder, this needs to be done with pure js as jquery does not play nicely
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
			  'width':position.mapWidth+'px',
			  'height':position.mapHeight+'px'
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
			hotspotPolygon.setAttribute("onclick", "$('#hotspot-content-"+i+"').popup(); $('#hotspot-content-"+i+"').popup('open');");
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
				'left':boundry.position().left + (boundry[0].getBBox().width / 2) - ($('#hotspot-title-'+i).width() / 2),
				'top':boundry.position().top + (boundry[0].getBBox().height / 2) - ($('#hotspot-title-'+i).height() / 2)
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
	var xPoint = percentageAsPoint(xPos,false) + position.xPosition - (pointRef.width() / 2);
	var yPoint = percentageAsPoint(yPos,true) + position.yPosition - (pointRef.height() / 2);
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
		$('#tmp').append('point=p1x-'+p1x+'- p1y-'+p1y+'- p2x-'+p2x+'- p2y-'+p2y+'<br>');
		
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
          'transform-origin':'0 100%';
		  'transform': transform,
		  'top':p1y+'px',
		  'left':p1x+'px'
        })
        .width(length);
	}
	
	console.log(newHotspot);
	$('#tmp').append(JSON.stringify(newHotspot)+'<br>');
}

//This function calculates a point passed as x/y (of the viewport) into the percentage position on the map - called by addPoint
function pointAsPercentage(point, AsHeight) {
	var thisPos = position.xPosition;
	var size = position.mapWidth;
	
	if (AsHeight) {
		thisPos = position.yPosition;
		size = position.mapHeight;
	}
	
	return (point - thisPos) / (size / 100);
}

//This function converts a map position passed as a percentage into the pixel value of the map - called by addPoint
function percentageAsPoint(percentage, AsHeight) {
	var size = position.mapWidth;
	if (AsHeight) {
		size = position.mapHeight;
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