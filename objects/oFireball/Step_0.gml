x += dir * spd;
if(place_meeting(x, y, oPlayer)){
	instance_destroy(self);
	oPlayer.kill();
} else if(x < -50 || x > 875){
	instance_destroy(self);
}
