// If we don’t currently have a valid player reference, try to find one

if (!instance_exists(player_ref)) {
    player_ref = instance_find(oPlayer, 0);
}

if(keyboard_check_pressed(vk_escape)){
	global.paused = !global.paused;
	if(!global.paused){
		global.pauseCount++;
		menu_state = "paused";
	} else {
		menu_state = "paused";
		prevInd = 0;
		PII = -1;
		imageSlow = 0;
		global.pauseIndex = 0;
		keybind_menu_index = 0;
	}
}