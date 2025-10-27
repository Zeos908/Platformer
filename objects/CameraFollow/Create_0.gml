/// @apply camera smoothing
/// pray it works
player = noone;
speeds = 0.5;

snapyRoom = false;



function camera(player)
{
	//var player = iPlayer;
	var x_player = player.x; 
	var y_player = player.y;
	
	
	 
    var distance = point_distance(x, y, x_player, y_player);


	if distance < 1000 // snap limit
	{ 
    speeds = 0.2; //ADJUST SMOOTHING HERE
	}
	else 
	{
		speeds = 1;
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
