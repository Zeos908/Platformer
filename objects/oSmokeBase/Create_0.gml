/// @description Insert description here
// You can write your code in this editor
function smoke(duration)
{
	for (i = 0; i<(duration*3); i++)
	{
		inst = instance_create_layer(x, y, "Instances_2", oSmokeSpawn)
	}
}