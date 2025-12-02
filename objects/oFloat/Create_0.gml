w = oFloatMask.sprite_width;
h = oFloatMask.sprite_height;
goal = [x, y];
slope = 0;
xsp = 0;
ysp = 0;
dir = 0;
delay = 0;
startx = x;
starty = y;
easePower = 0.75;  // higher = slower acceleration/deceleration
pause = 0.75;
prevSpd = 0;
unpaused = false;
