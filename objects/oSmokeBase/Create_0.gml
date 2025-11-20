/// @description Insert description here
// You can write your code in this editor
function smmoke(duration)
{
	for (i = 0; i<5; i++)
	{
		inst = instance_create_layer(x, y, "VFX", oSmokeSpawn)
		inst.sprite_index = sSmokeRed
		inst.image_xscale = 2
		inst.image_yscale = 2
		inst.smoke(duration);
	}
	instance_destroy();
}