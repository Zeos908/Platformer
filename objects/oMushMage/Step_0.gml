if(doStep && timer <= 0 && abs(px-x) < 200 && hp > 0){
	facing = (px > x) ? 1 : -1;
	if(coolDown == 0){
		if(finished){
			if(choose(1, 1) == 1){
				grimm();
				finished = 1;
			} else {
				//rain();
				finished = 2;
			}
		} else {
			if(finished == 1){
				grimm();
			} else {
				//rain();
			}
		}
	} else {
		coolDown--;
	}
	timer = oPlayer.secs(0.75);
	
}

timer--;
image_xscale = -facing;
if(global.blinking && iFrame == 0){
	if((abs(oBlinkDouble.x - x) < abs(oBlinkDouble.x - oPlayer.x)) && oBlinkDouble.y < y+32 && oBlinkDouble.y > y-32){
		hp--;
		if(hp == 0){
			
		} else {
			iFrame = oPlayer.secs(0.5);
		}
		
	}
}
if(iFrame > 0){
	iFrame--;
}
show_debug_message(timer)