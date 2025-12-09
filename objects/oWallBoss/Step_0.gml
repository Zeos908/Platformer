if(exitReq()) exit;

if(global.phighting[0] || test){
	if(atkCount >= 2 + phase * 3 && !orbAct){
		respawnOrb();
		atkCount = 0;
	}
	if(cooldwn <= 0){
		atk = irandom(phase) + 1;
		atk = 0;
		if(atk == 1){
			shockwave(irandom_range(310, 550), 0);
			atkCount++;
		} else if(atk == 2) {
			spike();
			atkCount++;
		} else {
			
			//wave(5);
			shockwave(527, 0);
			atkCount++;
		}
		cooldwn = 4 - phase ;
	} else {
		cooldwn -= delta_time / 1000000;
	}
} else if(hp > 0) {
	if(distance_to_object(oPlayer) < 70){
		global.bossStart = true;
		image_speed = 1;
	}
	if(image_index >= image_number - 1){
		//global.phighting[0] = true;
		test = true;
		//global.phighting[1] = 
		//global.phighting[2] = 
		image_speed = 0;
		global.bossStart = false;
		cooldwn = 3;
	}
} else {
	//death anim
	//if(image_index >= image_number)
}
