px = oPlayer.x
py = oPlayer.y
if(doStep && timer <= 0 && abs(px-x) < 200 && hp > 0){
	facing = (px > x) ? 1 : -1;
	global.phighting = [true, x - 199, x + 199];
	if(finished == true){
		if(choose(1, phase) == 1){
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
		if(hp <= 5){
			phase = 2;
			pause = 0.35;
		} 
		if(hp <= 0){
			global.phighting = [false, 0, 0];
			instance_destroy(self);
		} else {
			iFrame = oPlayer.secs(0.5);
		}
		
	}
}
if(iFrame > 0){
	iFrame--;
}
show_debug_message(hp)