/// Step Event for smooth wandering with easing
if(exitReq()) exit;
// Initialize delay if it doesn't exist
// Only decrease delay if active
if (delay > 0) {
    delay--;
} else {
	var inst = instance_nearest(x, y, oFloatMask);
	if(inst == noone){
		exit;
	}
    // Distance to current goal
    var dist = point_distance(x, y, goal[0], goal[1]);

    // Check if reached goal
    if (dist < 2) {
        // Pick a new random goal inside the mask
        startX = x;  // remember start of next movement
        startY = y;

        goal[0] = random_range(inst.x - (w/2), inst.x + (w/2));
        goal[1] = random_range(inst.y - (h/2), inst.y + (h/2));

        // Set delay before moving again
        delay = oPlayer.secs(pause);
    } else {

        // Calculate direction to goal
        var dir = point_direction(x, y, goal[0], goal[1]);

        // ---- Easing speed calculation ----
        var minSpd = 0.2;      // slowest speed (pixels per step)
        var maxSpd = 3;        // fastest speed
        var stopDist = 16;     // distance over which to decelerate

        // Ease-out: slow down near goal
        var easeOut = clamp(dist / stopDist, 0, 1);

        // Ease-in: accelerate from start
        var startDist = point_distance(startX, startY, goal[0], goal[1]);
        var traveled = startDist - dist;
        var easeIn = clamp(traveled / startDist, 0, 1);

        // Combine ease-in and ease-out
        var t = easeIn * easeOut;
		t = power(t, easePower);
        var spd = lerp(minSpd, maxSpd, t);

        // Move at computed speed
        x += lengthdir_x(spd, dir);
        y += lengthdir_y(spd, dir);
    }
}
if(place_meeting(x, y, oPlayer)){
	if (!global.blinking) {
	    // Reduce health
	    oPlayer.damage(1, 1, oFloat);
	}
}