function laser(xpos, ypos, x_scale, y_scale, durStart){
	inst = instance_create_layer(xpos, ypos, "Instances_2", oLaser, {durStart, x_scale, y_scale})
}

function laserAttack(){
	//spawn lasers
}