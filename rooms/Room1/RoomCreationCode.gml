// At the very top of your room creation code
if (!variable_global_exists("died")) {
    global.facing       = 1;
    global.canDash      = true;
    global.canSuperJump = true;
    global.debug        = false;
    global.blinking     = false;
    global.checkpoint   = [32, 330, 0];
    global.died         = false;
	global.phighting    = [false, 0, 0]; // Fighting?, x min, x max
	global.hp           = 5;
	global.maxHp        = 5;
	global.idol         = [false, false];
	global.beatBoss     = [false];
    show_debug_message("Globals initialized");
}