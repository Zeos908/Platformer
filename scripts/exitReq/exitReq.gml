function exitReq(){
	if (!variable_instance_exists(id, "prevSpd")) prevSpd = image_speed;
	if (!variable_instance_exists(id, "unpaused")) unpaused = false;

	if (global.paused) {
	    if (!unpaused) {
	        prevSpd = image_speed;  // store current speed
	        image_speed = 0;        // stop animation
	        unpaused = true;
	    }
		return true;
	} else if (unpaused) {
	    image_speed = prevSpd;      // restore animation
	    unpaused = false;
	}
	return false;
}