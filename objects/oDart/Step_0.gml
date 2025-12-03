x -= direc * 10;
if(place_meeting(x, y, oIsland) || place_meeting(x, y, oEnemy)){
	if(place_meeting(x, y, oEnemy)){
		global.hit = true;
		global.hitTimer = 0.1;
	} else {
		// break animation
	}
	instance_destroy(self);
}