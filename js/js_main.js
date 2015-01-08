$(document).ready(function(){
	$('.content_inner div').click(function(){
		$('.content_inner').each(function(){
			$(this).css('color','#000');
		});
		
		$(this).parent().css('color','#fff');
		
		var thisColour = $(this).parent().css('background-color');
		$('#head_outer h1').css('color',thisColour);
		
		alert('test alert');
		
		alert(device.model);
		
		alert('still here');
	});	
})