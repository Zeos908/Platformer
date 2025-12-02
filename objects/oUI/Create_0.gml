player_ref = noone;
image_ind = 0;
prevSpd = 0;
unpaused = false;
delay = 0;
prevInd = 0;
PII = -1;
imageSlow = 0;

// --- New menu / keybind variables ---
menu_state = "pause";
pause_selected_index = 0;
options_selected_index = 0;

keybind_menu_index = 0;
keybind_waiting = false;
keybind_waiting_action = "";
keybind_pulse = 0;

function paused(){
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