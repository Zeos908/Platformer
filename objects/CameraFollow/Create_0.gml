/// @apply camera smoothing
/// pray it works

player = noone;

speeds = 0.5;

snapyRoom = false;

phightingOffset = 30;



function camera(player)
{
	//var player = iPlayer;
	var x_player = player.x; 
	var y_player = player.y;
	if (global.phighting[0])
	{
		y_player -= phightingOffset;
	}
	
	// Get camera ID for viewport 0
	var cam = view_camera[0];

	// Current camera size
	var w = camera_get_view_width(cam);
	var h = camera_get_view_height(cam);

	// Normal and target sizes
	var normalW = 360;
	var normalH = 180;
	
	if(global.phighting[0]){
		normalW = 420;
		normalH = 210;
	}
	var targetW = 720;
	var targetH = 360;

	// Smooth factor
	var alpha = 0.1;

	// Check if current room is in the parkourRooms array
	var inParkour = false;
	for (var i = 0; i < array_length(global.parkourRooms); i++) {
	    if (room == global.parkourRooms[i]) {
	        inParkour = true;
	        break;
	    }
	}
	
	if (global.testRoomCondition == "test"
	)
	{
		targetW = 820;
		targetH = 460;
	}

	// Choose target size based on room
	var finalW = inParkour ? targetW : normalW;
	var finalH = inParkour ? targetH : normalH;
	// Smoothly interpolate camera size
	camera_set_view_size(cam, lerp(w, finalW, alpha), lerp(h, finalH, alpha));
	 
	if(inParkour){
		var target_x = oPlayer.x - w / 2;
		var target_y = oPlayer.y - h / 2;
		camera_set_view_pos(cam, target_x, target_y);
	}
    var distance = point_distance(x, y, x_player, y_player);

	
	if (global.phighting[0])
	{
		speeds = 0.05;
	}
	else if distance < 1000 // snap limit
	{ 
		speeds = 0.2; //ADJUST SMOOTHING HERE
	}
	
	else 
	{
		speeds = 1;
	}
	
	
			if global.testRoomCondition == "test"
			{
				y_player -= 30;
			}
	
	if (!(abs(speeds) == infinity || speeds == NaN || speeds == undefined)) && (!(distance == infinity || distance == NaN || distance == undefined))
	{
		x = lerp(x, x_player, speeds);
		y = lerp(y, y_player, speeds);
	}
	
	
			
}

function roomSnap(player)
{
	var x_player = player.x; 
	var y_player = player.y;
	   
	
	
	
	
	
	
	
	
	
	
	
	
	
	x = x_player;
	y = y_player;

}
