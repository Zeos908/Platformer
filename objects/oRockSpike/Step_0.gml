if(exitReq()) exit;

if(pause > 0){
	image_speed = 0;
	pause -= delta_time / 1000000
	if(image_index >= image_number - 1 && pause <= 0){
		instance_destroy(self);
	}
} else {
	image_speed = 1.25;
}

if(image_index >= image_number - 1 && !done){
	pause = 1.5;
	done = true;
	image_speed = 0;
}

if(image_index != 0 && place_meeting(x, y, oPlayer) && timer <= 0){
	oPlayer.damage(1, 1, self);
	timer = 1;
}
//show_debug_message(pause);
timer -= delta_time / 1000000;