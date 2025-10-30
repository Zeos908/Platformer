py = 0;
px = 0;
doStep = true;
facing = 0;
timer = 0;
inst = 0;
hp = 10;
phase = 1;
iFrame = 0;
fireballCount = 0;
rainCount = 0;
cooldown = 0;
fireballsShoot = choose(3, 5, 7);
attackNum = 0;
finished = true;
pause = 0.75;
delay = oPlayer.secs(4);
image_speed = 0;
function attack(player_x, player_y){
	py = player_y;
	px = player_x;
	doStep = true;
}

function fireball(curX, curY, pause, yDir){
	inst = instance_create_layer(curX, curY, "Instances_2", oFireball,
	{
	    spd : 8,
	    dirx : facing,
		wait : pause,
		diry : yDir
	});
}
function grimm(){
	if(cooldown <= 0){
		if(fireballCount % 2 == 0){
			fireball(x + (30 * facing), y, oPlayer.secs(pause), 0);
		} else {
			fireball(x + (30 * facing), y - 40, oPlayer.secs(pause), 0)
		}
		if(fireballCount == fireballsShoot){
			fireballCount = 0;
			cooldown = 2;
			fireballsShoot = choose(2, 4, 6);
			finished = true;
		} else {
			fireballCount++;
		}
	} else {
		cooldown--;
	}
}
function rain(){
	if(cooldown <= 0){
		x1 = irandom_range(250, 350);
		x2 = irandom_range(370, 460);
		x3 = irandom_range(480, 580);
		x4 = irandom_range(600, 690)
		fireball(x1, 250, oPlayer.secs(pause + 0.5), 1);
		fireball(x2, 250, oPlayer.secs(pause + 0.5), 1);
		fireball(x3, 250, oPlayer.secs(pause + 0.5), 1);
		fireball(x4, 250, oPlayer.secs(pause + 0.5), 1);
		rainCount ++;
		cooldown = 2;
		if(rainCount == 3){
			
			finished = true;
			rainCount = 0;
		}
	} else {
		cooldown--;
	}
}