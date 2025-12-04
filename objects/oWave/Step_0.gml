if(global.phighting[1] < x){
	x -= spd;
	if(place_meeting(x, y, oPlayer) && !global.blinking){
		oPlayer.damage(1, 1, self)
	}
} else {
	instance_destroy(self);
}