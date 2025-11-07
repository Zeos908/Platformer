function smoothSpeed(goal, minSpd){
	// Calculate direction to goal
	var dir = point_direction(x, y, goal[0], goal[1]);

	// ---- Easing speed calculation ----
	//var minSpd = 0.2;      // slowest speed (pixels per step)
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