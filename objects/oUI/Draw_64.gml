
if (player_ref != noone) {
	if (global.paused) {
	    var screen_w = display_get_gui_width();
	    var screen_h = display_get_gui_height();

	    // Dim the screen
	    draw_set_alpha(0.5);
	    draw_set_color(c_black);
	    draw_rectangle(0, 0, screen_w, screen_h, false);
	    draw_set_alpha(1);
		
		draw_sprite_ext(sPauseMenu, 0, screen_w / 2, screen_h / 2, 0.2, 0.2, 0, c_white, 1);
		var x_pos = global.pausePos[global.pauseIndex][0]
		var y_pos = global.pausePos[global.pauseIndex][1]
		var x_shift = 2
		draw_sprite_ext(sMenuSelector, 0, screen_w / 2 - x_pos + x_shift, y_pos, 2, 2, 0, c_white, 1);
		if(global.pauseIndex == 1){
			x_shift = 3;
		} else if(global.pauseIndex == 2){
			x_shift = -1;
		}
		draw_sprite_ext(sMenuSelector, 0, screen_w / 2 + x_pos + x_shift, y_pos, -2, 2, 0, c_white, 1);
		if(prevInd != global.pauseIndex){
			//disapear animation
			PII++;
			var x_pos = global.pausePos[prevInd][0]
			var y_pos = global.pausePos[prevInd][1]
			draw_sprite_ext(sMenuSelectorDis, PII, screen_w / 2 - x_pos + x_shift, y_pos, 2, 2, 0, c_white, 1);
			if(global.pauseIndex == 1){
				x_shift = 3;
			} else if(global.pauseIndex == 2){
				x_shift = -1;
			}
			draw_sprite_ext(sMenuSelectorDis, PII, screen_w / 2 + x_pos + x_shift, y_pos, -2, 2, 0, c_white, 1);
			if(PII >= 5){
				PII = -1;
				prevInd = global.pauseIndex;
			}
		} else {
			prevInd = global.pauseIndex;
		}
		if(delay <= 0){
			if(keyboard_check(ord("S")) || keyboard_check(vk_down)){
				global.pauseIndex++;
				if(global.pauseIndex > 2){
					global.pauseIndex = 0;
				}
				delay = oPlayer.secs(0.4);
			} else if(keyboard_check(ord("W")) || keyboard_check(vk_up)){
				global.pauseIndex--;
				if(global.pauseIndex < 0){
					global.pauseIndex = 2;
				}
				delay = oPlayer.secs(0.4);
			}
		} else {
			delay--;
		}
		if(keyboard_check_pressed(global.keybinds[? "Jump"]) || keyboard_check_pressed(vk_enter)){
			switch(global.pauseIndex){
				case 0:
					global.paused = false;
					break;
				case 1:
					// options
					break;
				case 2:
					//go to menu
					break;
			}
		}
		
	}
	if(exitReq()) exit;
    var total_hearts = global.maxHp;
    var hp = global.hp;
    var start_x = 20;
    var start_y = 20;
	var x_jelly = 58;
    var y_jelly = 40;
    var spacing = 24; // smaller spacing to match smaller size
    var scale = 1;  // size
	var keyFrames = [0, 12, 24, 38]
	var frameGoal = 0;
    for (var i = 0; i < total_hearts; i++) {
        var spr = (i < hp) ? sHealth : sHealthGone;
        draw_sprite_ext(spr, 0, start_x + i * spacing, start_y, scale, scale, 0, c_white, 1);
    }
	frameGoal = keyFrames[global.jelly];
	if(image_ind < frameGoal){
		image_ind++;
		//show_debug_message("HUH");
	} else {
		image_ind = frameGoal;
	}
	draw_sprite_ext(sJellyCont, image_ind, x_jelly, y_jelly, 2.5, 1.5, 0, c_white, 1);
	
	
	//show_debug_message(frameGoal);
}