var dist = 100
done = false;
image_speed = 1.25;
image_xscale = 2.5;
image_yscale = 5;
switch(dir){
	case -1:
		if(place_meeting(x - dist, y + 1, oIsland) && !place_meeting(x - dist, y, oWallBoss)){
			oWallBoss.spike(x - dist, -1);
		}
		//show_debug_message(x - dist);
		break;
	case 1:
		if(place_meeting(x + dist, y + 1, oIsland) && !place_meeting(x + dist, y, oWallBoss)){
			oWallBoss.spike(x + dist, 1);
		}
		//show_debug_message("right: " + string(x + dist));
		break;
	case 0:
		if(place_meeting(x + dist, y + 1, oIsland) && !place_meeting(x + dist, y, oWallBoss)){
			oWallBoss.spike(x + dist, 1);
		}
		if(place_meeting(x - dist, y + 1, oIsland) && !place_meeting(x - dist, y, oWallBoss)){
			oWallBoss.spike(x - dist, -1);
		}
		//show_debug_message(x - dist);
		//show_debug_message(x + dist);
		//show_debug_message("start: " + string(x));
		break;
}
pause = 2;

//show_debug_message(pause);