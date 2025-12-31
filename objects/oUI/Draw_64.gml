
if (player_ref != noone) {
	
	var total_hearts = global.maxHp;
    var hp = global.hp;
    var start_x = 20;
    var start_y = 20;	
    var y_jelly = 40;
    var spacing = 24; // smaller spacing to match smaller size
    var scale = 1;  // size
	var keyFrames = [0, 12, 24, 38]
	var frameGoal = [0, 0, 0];
	var contsFilled = 0;
    for (var i = 0; i < total_hearts; i++) {
        var spr = (i < hp) ? sHealth : sHealthGone;
        draw_sprite_ext(spr, 0, start_x + i * spacing, start_y, scale, scale, 0, c_white, 1);
    }
	contsFilled = global.jelly div 3;
	for(var i = 0; i < contsFilled; i++){
		frameGoal[i] = keyFrames[3]
	}
	
	for(var i = contsFilled; i < 3; i++){
		if(i = contsFilled){
			frameGoal[i] = keyFrames[global.jelly % 3]
		} else {
			frameGoal[i] = 0;
		}
	}
	
	for(var i = 0; i < 3; i++){
		if(image_ind[i] >= frameGoal[i]){
			image_ind[i] = frameGoal[i];
		} else {
			image_ind[i]++;
			break;
		}
	}
	
	var x_jelly = [21 , 50, 79];
	for(var i = 0; i < 3; i++){
		if(i < contsFilled){
			draw_sprite_ext(sJellyCont, image_ind[i], x_jelly[i], y_jelly, 0.7, 0.7, 0, c_white, 1);
		} else if (i == contsFilled){
			draw_sprite_ext(sJellyCont, image_ind[i], x_jelly[i], y_jelly, 0.7, 0.7, 0, c_white, 1);
		} else {
			draw_sprite_ext(sJellyCont, image_ind[i], x_jelly[i], y_jelly, 0.7, 0.7, 0, c_white, 1);
		}
	}
	if (global.paused) {
		switch(menu_state){
			case "paused":
				paused();
				break;
			case "options":
				keys();
				break;
			
		}
	}
	//if(exitReq()) exit;
    
	
	
	//show_debug_message(frameGoal);
}