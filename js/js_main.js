function populateDeviceDetails(){
	$('#content_outer .device_details').HTML('Device Model: '    + device.model    + '<br />' +
                            'Device Cordova: '  + device.cordova  + '<br />' +
                            'Device Platform: ' + device.platform + '<br />' +
                            'Device UUID: '     + device.uuid     + '<br />' +
                            'Device Version: '  + device.version  + '<br />');
}

function fireDeviceReady(){
	populateDeviceDetails();
}