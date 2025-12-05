if(global.phighting[0]){
	if(cooldwn == 0){
		atk = irandom(phase) + 1;
		wave(5);
		atk = 0;
		if(atk == 1){
			shockwave(irandom_range(310, 550));
		} else if(atk == 2) {
			spike();
		} else {
			wave(10);
		}
		cooldwn = 5
	}
	oPlayer.hit(self);
	if(cooldwn > 0){
		cooldwn -= delta_time / 1000000;
	}
} else {
	if(distance_to_object(oPlayer) < 30){
		global.bossStart = true;
		image_speed = 1;
		if(image_index >= sprite_get_number(sWallSpawnAnim) - 1){
			//global.phighting[0] = true;
			//global.phighting[1] = 
			//global.phighting[2] = 
			image_speed = 0;
			global.bossStart = false;
		}
	}
}
