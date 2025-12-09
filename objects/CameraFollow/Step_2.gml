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
