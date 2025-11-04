

if(!global.beatBoss[0]){
	px = oPlayer.x
	py = oPlayer.y
	if(delay <= 0){
		//show_debug_message(string(sprite_index == sMageGrimm) + ", " + string(image_index));
		if(sprite_index == sMageGrimm && image_index >= 18){
			image_speed = 0;
			image_index = 0;
			//show_debug_message("ended");
		}
		if(sprite_index == sMageRain && image_index >= 18){
			image_speed = 0;
			image_index = 0;
			//show_debug_message("ended");
		}
		if(global.paused) exit;
		if(doStep && timer <= 0 && abs(px-x) < 200 && hp > 0){
			
			facing = (px > x) ? 1 : -1;
			global.phighting = [true, x - 199, x + 199];
			if(finished == true){
				if(choose(1, phase) == 1){
					//show_debug_message("starting");
					sprite_index = sMageGrimm;
					image_speed = 1;
					grimm();
					attackNum = 1;
					finished = false;
				} else {
					sprite_index = sMageRain;
					image_speed = 1;
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
					global.beatBoss[0] = true;
				} else {
					iFrame = oPlayer.secs(0.5);
				}
		
			}
		}
		if(iFrame > 0){
			iFrame--;
		}
		//show_debug_message(hp)
	} else {
		if(abs(px-x) < 200){
			delay--;
			global.phighting = [true, x - 199, x + 199];
			if(image_index = 0){
				image_speed = 1
			} else if(image_index >= 10){
				image_speed = 0;
			}
		}
		
	}
	//show_debug_message(image_index);
} else {
	instance_destroy(self);
}