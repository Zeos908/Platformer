function doTimers(){
	if(global.freeze > 0){
		global.freeze -= delta_time / 1000000;
	}
	/*
	if(global.blinkPause > 0){
		global.blinkPause -= delta_time / 1000000;
	} else {
		global.blinking = false;
		global.blinked = false;
	}
	*/
	//show_debug_message(global.blinked);
}