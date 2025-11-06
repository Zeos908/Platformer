// Distance to goal
dist = point_distance(x, y, goal[0], goal[1]);

// If close enough to goal, pick a new one
if (dist < 2) {
    goal[0] = random_range(oFloatMask.x - (w/2), oFloatMask.x + (w/2));
    goal[1] = random_range(oFloatMask.y - (h/2), oFloatMask.y + (h/2));
}

// Calculate direction and move at a constant speed
dir = point_direction(x, y, goal[0], goal[1]);

x += lengthdir_x(maxSpd, dir);
y += lengthdir_y(maxSpd, dir);