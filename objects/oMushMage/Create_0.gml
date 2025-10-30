py = 0;
px = 0;
doStep = false;
facing = 0;
timer = 0;
inst = 0;
hp = 5;
iFrame = 0;
fireballCount = 0;
rainCount = 0;
coolDown = 0;
fireballsShoot = choose(3, 5, 7);
finished = true;
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
	if(fireballCount % 2 == 0){
		fireball(x + (30 * facing), y, oPlayer.secs(0.25), 0);
	} else {
		fireball(x + (30 * facing), y - 40, oPlayer.secs(0.25), 0)
	}
	if(fireballCount == fireballsShoot){
		fireballCount = 0;
		coolDown = 2;
		fireballsShoot = choose(2, 4, 6);
		finished = true;
	} else {
		fireballCount++;
	}
}
function rain(){
	x1 = irandom_range(300, 400);
	x2 = irandom_range(420, 520);
	x3 = irandom_range(540, 640);
	fireball(x1, 200, oPlayer.sec(0.75), 1);
}