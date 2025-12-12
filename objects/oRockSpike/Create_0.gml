var dist = 100
done = false;
image_speed = 0;
image_xscale = 2.5;
image_yscale = 5;
idontfeellikethinking = 0;
timer = 0;
switch(dir){
	case -1:
		if(place_meeting(x - dist, y + 1, oIsland) /*&& !place_meeting(x - dist, y, oWallBoss)*/){
			oWallBoss.spike(x - dist, -1);
		}
		//show_debug_message(x - dist);
		break;
	case 1:
		if(place_meeting(x + dist, y + 1, oIsland) /*&& !place_meeting(x + dist, y, oWallBoss)*/){
			oWallBoss.spike(x + dist, 1);
		}
		//show_debug_message("right: " + string(x + dist));
		break;
	case 0:
		if(place_meeting(x + dist, y + 1, oIsland) /*&& !place_meeting(x + dist, y, oWallBoss)*/){
			oWallBoss.spike(x + dist, 1);
		}
		if(place_meeting(x - dist, y + 1, oIsland) /*&& !place_meeting(x - dist, y, oWallBoss)*/){
			oWallBoss.spike(x - dist, -1);
		}
		//show_debug_message(x - dist);
		//show_debug_message(x + dist);
		//show_debug_message("start: " + string(x));
		break;
}
pause = 2;
idontfeellikethinking = image_index;
//show_debug_message(pause);