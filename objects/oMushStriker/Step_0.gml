/// @description Repeat every frame

//detect only when agro requires a refresh
if (!sleep) && (agro< 5)
{
	detectPlayer();
}

if (agro > 0)
{
	// chase player and attack when in range
	
	if checkAttackRange(oPlayer) && !attacked
	{
		attack(oPlayer)
	}
	else 
	{
		//must not be in attack range
		// teleport to random location near the player
		move(oPlayer);
	}
}




/// subtract timers
agro -= delta_time;


