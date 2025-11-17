if(image_index == 34){
	//image_speed = 0;
} else if(place_meeting(x, y, oPlayer) && iFrame == 0){
	oPlayer.damage(1, 0, oLaser);
	iFrame = oPlayer.secs(1);
}
if(iFrame > 0){
	iFrame --;;
}