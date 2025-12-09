if(delay > 0){
	image_speed = 0;
	delay -= delta_time / 1000000;
} else {
	image_speed = 1;
}

if(image_index >= image_number - 1){
	instance_destroy(self);
}