/// @description Insert description here
// You can write your code in this editor

// Step event of CameraFollow

if (!snapyRoom)
{
	roomSnap(oPlayer);
	snapyRoom = true;
}

if (!instance_exists(player)) {
    player = instance_find(oPlayer, 0);
}



if (global.phighting[0])
{
	//var nearEnem = instance_nearest(oPlayer.x, oPlayer.y, oEnemy);
	
	camera(oPlayer);
}
else
{
	if (instance_exists(player)) {
	    var x_player = player.x;
	    var y_player = player.y;

	    // Calculate distance safely
	    //distance = distance_to_point(x_player, y_player);

	    // Call camera function
	    camera(player);
	}
}
/*

 /// Step Event of camera object

// ----------------------
// Settings
// ----------------------
var move_speed = 0.25;      
var zoom_speed = 0.08;      
var phightingOffset = 30;    
var aspect_ratio = 2 / 1;    

// ----------------------
// Phighting data
// ----------------------
var fighting  = global.phighting[0];
var min_x     = global.phighting[1];
var max_x     = global.phighting[2];
var fight_y   = global.phighting[3];

// ----------------------
// Camera reference
// ----------------------
var cam = view_camera[0];
var vw  = camera_get_view_width(cam);
var vh  = camera_get_view_height(cam);

// ----------------------
// Detect parkour room
// ----------------------
var in_parkour = false;
for (var i = 0; i < array_length(global.parkourRooms); i++)
{
    if (global.parkourRooms[i] == room) {
        in_parkour = true;
        break;
    }
}

// ----------------------
// Target camera size
// ----------------------
var target_w;
var target_h;

if (!fighting)
{
    target_w = in_parkour ? 720 : 360;
    target_h = target_w / aspect_ratio;
}
else
{
    target_w = max_x - min_x;
    target_h = target_w / aspect_ratio;
}

// Smoothly interpolate view size
camera_set_view_size(cam, lerp(vw, target_w, zoom_speed), lerp(vh, target_h, zoom_speed));

// ----------------------
// Target camera position
// ----------------------
var target_x = x;  // default to current x
var target_y = y;  // default to current y

if (instance_exists(oPlayer))
{
    if (!fighting)
    {
        target_x = oPlayer.x //- target_w * 0.5;
        target_y = oPlayer.y //- target_h * 0.5;
    }
    else
    {
        target_x = min_x;
        target_y = fight_y - target_h * 0.5 - phightingOffset;
    }

    // Clamp to room bounds
    //target_x = clamp(target_x, 0, room_width - target_w);
    //target_y = clamp(target_y, 0, room_height - target_h);

    // Smoothly move camera
    x = lerp(x, target_x, move_speed);
    y = lerp(y, target_y, move_speed);
}

show_debug_message("x: " + string(x) + 
				   "target x: " + string(target_x));


/*
show_debug_message("cam_x: " + string(cam_x) + 
                   "  cam_y: " + string(cam_y) + 
                   "  target_x: " + string(target_x) + 
                   "  target_y: " + string(target_y) + 
                   "  player: " + string(oPlayer.x) + "," + string(oPlayer.y));



