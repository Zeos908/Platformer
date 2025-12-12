if(exitReq()) exit;

if(pause >= 0){
	image_speed = 0;
	pause -= delta_time / 1000000
} else {
	image_speed = 1;
}

if(image_index >= image_number - 1){
	instance_destroy(self);
} else if (image_index == 0){
	switch(dir){
		case -1:
			if(place_meeting(x - 20, y + 1, oIsland)){
				oWallBoss.spike(x - 20, -1);
			}
			break;
		case 1:
			if(place_meeting(x + 20, y + 1, oIsland)){
				oWallBoss.spike(x + 20, 1);
			}
			break;
		case 0:
			if(place_meeting(x + 20, y + 1, oIsland)){
				oWallBoss.spike(x + 20, 1);
			}
			if(place_meeting(x - 20, y + 1, oIsland)){
				oWallBoss.spike(x - 20, -1);
			}
			break;
	}
}