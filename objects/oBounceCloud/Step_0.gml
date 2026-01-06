if(exitReq()) exit;
if(place_meeting(x, y, oPlayer)){
	oPlayer.bounce(1);
}
if(inst == noone) exit;
show_debug_message(goal[goalInd]);
if(delay <= 0){
	var dist = abs(goal[goalInd] - x);
	var dir = goalInd * 2 - 1;
	if(dist < maxSpd){
		goalInd = (goalInd == 1) ? 0 : 1;
		delay = oPlayer.secs(0.75);
		dist = goalInd * 2 - 1;
	} else {
		/*
		******* GPT **********8

	    // ---- Easing speed calculation ----
	    var minSpd = 0.2;      // slowest speed (pixels per step)     // fastest speed
	    var stopDist = 16;     // distance over which to decelerate

	    // Ease-out: slow down near goal
	    var easeOut = clamp(dist / stopDist, 0, 1);

	    // Ease-in: accelerate from start
	    var startDist = abs(goal - x);
	    var traveled = startDist - dist;
	    var easeIn = clamp(traveled / startDist, 0, 1);

	    // Combine ease-in and ease-out
	    var t = easeIn * easeOut;
		t = power(t, easePower);
	    var spd = lerp(minSpd, maxSpd, 0.001);

	    // Move at computed speed
	    x += lengthdir_x(spd, dir);
		****** Not GPT **********
		*/
		if(dist > (5 * w/6)){
			
			spd = lerp(spd, maxSpd, 0.1);
		} else if (dist < (w / 6)){
			
			spd = lerp(minSpd, spd, 0.9);
		} else {
			spd = 2;

		}
		x += spd * dir;
		show_debug_message(spd);
	}
} else {
	delay --;
}