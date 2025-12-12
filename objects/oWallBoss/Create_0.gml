hp = 4;
phase = 1;
facing = -1;
image_speed = 0;
atk = 0;
cooldwn = 0;
test = false;
atkCount = 0;
orbAct = false;

function shockwave(start, direc){
	instance_create_layer(start, 320, "Instances_2", oShockwave, 
	{
		delay : 0,
		dir : direc
	});
}

function wave(sped){
	instance_create_layer(x - 10, y, "Instances_2", oWave, 
	{
		spd : sped
		});
}
	
function spike(start, direc){
	instance_create_layer(start, 280, "Instances_2", oRockSpike, 
	{
		dir : direc
	});
}

function respawnOrb(){
	var ped_count = instance_number(oPedestal);

	if (ped_count > 0) {
	    var index = irandom(ped_count - 1);
	    var ped = instance_find(oPedestal, index);

	    ped.sprite_index = sPedestalOrb;
		ped.image_speed = 0;
		orbAct = true;
	}
}