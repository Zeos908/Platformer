if(keyboard_check_pressed(vk_escape)){
	global.paused = !global.paused;
	if(!global.paused){
		global.pauseCount++;
	}
}