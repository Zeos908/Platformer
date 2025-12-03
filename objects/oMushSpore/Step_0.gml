if(exitReq()) exit;
if(place_meeting(x,y,oPlayer) && !global.blinking){
	oPlayer.damage(2, 1, self);
}