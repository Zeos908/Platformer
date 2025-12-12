if(exitReq()) exit;
if(delay > 0){
	image_speed = 0;
	delay -= delta_time / 1000000;
} else {
	image_speed = 1;
}

if(image_index >= image_number - 1){
	instance_destroy(self);
} else if (image_index > 2 && image_index < 4 && !next){
	switch(dir){
		case -1:
			if(place_meeting(x - 20, y + 1, oIsland)){
				oWallBoss.shockwave(x - 20, -1);
			}
			break;
		case 1:
			if(place_meeting(x + 20, y + 1, oIsland)){
				oWallBoss.shockwave(x + 20, 1);
			}
			break;
		case 0:
			if(place_meeting(x + 20, y + 1, oIsland)){
				oWallBoss.shockwave(x + 20, 1);
			}
			if(place_meeting(x - 20, y + 1, oIsland)){
				oWallBoss.shockwave(x - 20, -1);
			}
			break;
	}
	next = true;
}

if(place_meeting(x, y, oPlayer)){
	oPlayer.damage(1, 1, self)
}