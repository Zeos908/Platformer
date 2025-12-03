
if (player_ref != noone) {
	
	var total_hearts = global.maxHp;
    var hp = global.hp;
    var start_x = 20;
    var start_y = 20;
	//x_jelly = 30;
	if(keyboard_check(vk_left)){
		x_jelly--;
	} else if(keyboard_check(vk_right)){
		x_jelly ++;
	}
	show_debug_message(x_jelly);
    var y_jelly = 40;
    var spacing = 24; // smaller spacing to match smaller size
    var scale = 1;  // size
	var keyFrames = [0, 12, 24, 38]
	var frameGoal = 0;
	var contsFilled = 0;
    for (var i = 0; i < total_hearts; i++) {
        var spr = (i < hp) ? sHealth : sHealthGone;
        draw_sprite_ext(spr, 0, start_x + i * spacing, start_y, scale, scale, 0, c_white, 1);
    }
	frameGoal = keyFrames[global.jelly % 3];
	contsFilled = global.jelly div 3;
	if(image_ind < frameGoal){
		image_ind++;
		//show_debug_message("HUH");
	} else {
		image_ind = frameGoal;
	}
	for(var i = 0; i < 3; i++){
		if(i < contsFilled){
			draw_sprite_ext(sJellyCont, 38, 21, y_jelly, 0.7, 0.7, 0, c_white, 1);
		} else if (i == contsFilled){
			//draw_sprite_ext(sJellyCont, image_ind, x_jelly, y_jelly, 2.5, 1.5, 0, c_white, 1);
		} else {
			//draw_sprite_ext(sJellyCont, image_ind, x_jelly, y_jelly, 2.5, 1.5, 0, c_white, 1);
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