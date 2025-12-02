/// @description MushStriker actions
prevSpd = 0;
unpaused = false;

agro = 0; 

cooldown = 50;

detectionDistance = 100;

sleeping = false;

attackDistance = 50; 

attacked = false;

betweenActions = 0;

betweenActionTime = 20;

position = [0,0];

yy = 0;

image_speed = 1;

/// teleport/movement


timeTillAppear = 0;
timeToAppear = 40;

//know that distances are all counted in gmk units. use the room view to see how far this is. 


function detectPlayer()
{
	var raycastDirection = point_direction(x,y, oPlayer.x, oPlayer.y)
	var endpointX = lengthdir_x(detectionDistance, raycastDirection);
	var endpointY = lengthdir_y(detectionDistance, raycastDirection);
	var hit = collision_line(x, y, oPlayer.x, oPlayer.y, oIsland, false, true);
	
	if (distance_to_object(oPlayer) < detectionDistance) && hit == noone
	{
		return cooldown;
	}
	return agro;
}

function checkAttackRange(obj)
{
	var distance = distance_to_object(obj)
	if distance > attackDistance
	{
		return true;
	}
	else
	{
		return false;
	}
}

function move(target)
{
	var dir = random(360);
	var endpointX = target.x + lengthdir_x(attackDistance*random_range(0.5,1), dir);
	var endpointY = target.y + lengthdir_y(attackDistance*random_range(0.5,1), dir);
	
	var count = 0
	while place_meeting(endpointX, endpointY, oIsland) && count < 50
	{
		 dir = random(360);
		 endpointX = target.x + lengthdir_x(attackDistance*random_range(0.5,1), dir);
		 endpointY = target.y + lengthdir_y(attackDistance*random_range(0.5,1), dir);
		 count++;
	}
	/*/
	for(i = 0; i < 20; i++){
		if(place_meeting(endpointX, endpointY, oIsland)){
			dir = random(360);
			endpointX = lengthdir_x(attackDistance, dir);
			endpointY = lengthdir_y(attackDistance, dir);
		} else {
			break;
		}
	}
	dunno what i was writing here
	*/
	
	
	// actually move the object
	
	betweenActions = betweenActionTime;

	return [endpointX, endpointY];
}

function attack(target)
{
	//sprite_index = oStrikerAttack;
	attacked = true;
}
