py = 0;
px = 0;
doStep = false;
facing = 0;
timer = 0;
inst = 0;
hp = 5;
iFrame = 0;
fireballCount = 0;
coolDown = 0;
fireballsShoot = choose(3, 5, 7);
function attack(player_x, player_y){
	py = player_y;
	px = player_x;
	doStep = true;
}

function fireball(curX, curY, pause){
	inst = instance_create_layer(curX, curY, "Instances_2", oFireball,
	{
	    spd : 8,
	    dir : facing,
		wait : pause
	});
}
function grimm(){
	if(coolDown == 0){
		if(fireballCount % 2 == 0){
			fireball(x, y, 0);
		} else {
			fireball(x, y-40, 0)
		}
		if(fireballCount == fireballsShoot){
			fireballCount = 0;
			coolDown = 2;
			fireballsShoot = choose(2, 4, 6);
		} else {
			fireballCount++;
		}
	} else {
		coolDown--;
	}
}