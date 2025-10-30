px = oPlayer.x
py = oPlayer.y
if(doStep && timer <= 0 && abs(px-x) < 200 && hp > 0){
	facing = (px > x) ? 1 : -1;
	if(finished == true){
		if(choose(1, 2) == 1){
			grimm();
			attackNum = 1;
			finished = false;
		} else {
			rain();
			attackNum = 2;
			finished = false;
		}
	} else {
		if(attackNum == 1){
			grimm();
		} else if(attackNum == 2) {
			rain();
}
	}
	timer = oPlayer.secs(0.75);
	
} else {
	timer--;
}
image_xscale = -facing;
if(global.blinking && iFrame == 0){
	if((abs(oBlinkDouble.x - x) < abs(oBlinkDouble.x - oPlayer.x)) && oBlinkDouble.y < y+32 && oBlinkDouble.y > y-32){
		hp--;
		if(hp == 0){
			instance_destroy(self);
		} else {
			iFrame = oPlayer.secs(0.5);
		}
		
	}
}
if(iFrame > 0){
	iFrame--;
}
//show_debug_message(timer)