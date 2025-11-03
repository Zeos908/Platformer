/// @description MushStriker actions


agro = 0; 

cooldown = 10;

detectionDistance = 100;


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
