if(exitReq()) exit;

if(global.phighting[0] || test){
	if(atkCount >= 2 + phase * 3 && !orbAct){
		respawnOrb();
		atkCount = 0;
	}
	if(cooldwn <= 0){
		atk = irandom(phase + 1) + 1;
		if(atk == 1){
			shockwave(irandom_range(310, 550), 0);
			atkCount++;
		} else if(atk == 2) {
			spike(irandom_range(310, 550), 0);
			atkCount++;
		} else {
			wave(5);
			atkCount++;
		}
		cooldwn = 7 - phase ;
	} else {
		cooldwn -= delta_time / 1000000;
	}
	if(hp <= 0) global.phighting[0] = false;
} else if(hp > 0) {
	if(distance_to_object(oPlayer) < 70){
		global.bossStart = true;
		image_speed = 1;
	}
	if(image_index >= image_number - 1){
		global.phighting[0] = true;
		test = true;
		global.phighting[2] = x - 16;
		//show_debug_message(string(x) + ": RIGHT");
		global.phighting[1] = 15;
		global.phighting[3] = 240
		image_speed = 0;
		global.bossStart = false;
		cooldwn = 1;
	}
} else {
	//death anim
	//sprite_index = sWallDie
	//if(image_index >= image_number) instance_destroy(self);
}
