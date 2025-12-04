hp = 4;
phase = 1;
facing = -1;
image_speed = 0;
function shockwave(start){
	
}

function wave(dir){
	
}

function respawnOrb(){
	var ped_count = instance_number(oPedestal);

	if (ped_count > 0) {
	    var index = irandom(ped_count - 1);
	    var ped = instance_find(oPedestal, index);

	    ped.sprite_index = sPedestalOrb;
	}
}