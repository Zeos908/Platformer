//room change shinanigans
global.nxRoom = false;
global.prRoom = false;

function nextRoom(roomIndex)
{
	
	var spawn = instance_nearest(x, y, oPrevRoom);
	x = spawn.x + 40; 
	y = spawn.y - 10;
}

function prevRoom(roomIndex)
{
	var spawn = instance_nearest(x, y, oNextRoom);
	x = spawn.x - 40; 
	y = spawn.y - 10;
	
}
	