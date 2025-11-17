/// @description MushStriker actions


agro = 0; 

cooldown = 10;

detectionDistance = 100;

sleeping = false;

attackDistance = 65; 

attacked = false;

//know that distances are all counted in gmk units. use the room view to see how far this is. 


function detectPlayer()
{
	var raycastDirection = point_direction(x,y, oPlayer.x, oPlayer.y)
	var endpointX = lengthdir_x(detectionDistance, raycastDirection);
	var endpointY = lengthdir_y(detectionDistance, raycastDirection);
	var hit = physics_raycast(x, y, oPlayer.x, oPlayer.y, oIsland, false)
	
	if (distance_to_object(oPlayer) < detectPlayer())
	{
		return cooldown;
	}
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
	var endpointX = lengthdir_x(attackDistance, dir);
	var endpointY = lengthdir_y(attackDistance, dir);
	/*while place_meeting(endpointX, endpointY, oIsland)
	{
		 dir = random(360);
		 endpointX = lengthdir_x(attackDistance, dir);
		 endpointY = lengthdir_y(attackDistance, dir);
	}
	*/
	for(var i = 0; i < 20; i++){
		if(place_meeting(endpointX, endpointY, oIsland)){
			dir = random(360);
			endpointX = lengthdir_x(attackDistance, dir);
			endpointY = lengthdir_y(attackDistance, dir);
		} else {
			break;
		}
	}
	
	
		
}

function attack(target)
{
	//sprite_index = oStrikerAttack;
	
}
