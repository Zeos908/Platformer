if(exitReq()) exit;
if(image_index == 34){
	image_speed = 0;
	instance_destroy(self);
} else if(image_index == 0){
	if(durStart > 0){
		durStart -= delta_time / 1000000;
	} else {
		image_speed = 1;
	}
} else if(place_meeting(x, y, oPlayer) && iFrame == 0){
	oPlayer.damage(1, 0, oLaser);
	iFrame = oPlayer.secs(1.5);
}
if(iFrame > 0){
	iFrame --;;
}
