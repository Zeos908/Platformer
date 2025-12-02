// If we don’t currently have a valid player reference, try to find one

if (!instance_exists(player_ref)) {
    player_ref = instance_find(oPlayer, 0);
}

if(keyboard_check_pressed(vk_escape)){
	global.paused = !global.paused;
	if(!global.paused){
		global.pauseCount++;
	}
}