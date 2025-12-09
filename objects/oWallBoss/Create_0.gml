hp = 4;
phase = 1;
facing = -1;
image_speed = 0;
atk = 0;
cooldwn = 0;
test = false;
atkCount = 0;
orbAct = false;

function shockwave(start){
	instance_create_layer(start, 333, "Instances_2", oShockwave, 
	{
		delay : 0.2
	});
}

function wave(sped){
	instance_create_layer(x - 10, y, "Instances_2", oWave, 
	{
		spd : sped
		});
	show_debug_message("TEST WAVE")
}
	
function spike(){
	
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