
inst = instance_nearest(x, y, oFloatMask);
maxSpd = 2;
goalInd = 0;
startX = x;
easePower = 0.75;  // higher = slower acceleration/deceleration
delay = 0;
dist = 0;
minSpd = 1;
spd = 0;
prevSpd = 0;
unpaused = false;
if(inst == noone) exit;
w = oFloatMask.sprite_width;
h = oFloatMask.sprite_height;
goal = [inst.x - (w/2), inst.x + (w/2)];
x = inst.x - (w/2);