/// @description Insert description here
if(exitReq()) exit;
// You can write your code in this editor
image_alpha -= lerp(image_alpha, 0, 0.92);
x += x_factor*image_speed;
y += y_factor*image_speed;