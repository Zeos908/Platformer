var inst = instance_nearest(x, y, oFloatMask);
w = oFloatMask.sprite_width;
h = oFloatMask.sprite_height;
x = inst.x - (w/2);
maxSpd = 2;
goal = [inst.x - (w/2), inst.x + (w/2)];
goalInd = 0;
startX = x;
easePower = 0.75;  // higher = slower acceleration/deceleration
delay = 0;
dist = 0;
minSpd = 1;
spd = 0;
