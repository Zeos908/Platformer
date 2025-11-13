// At the very top of your room creation code
if (!variable_global_exists("died")) {
    global.facing       = 1;
    global.canDash      = false;
    global.canSuperJump = false;
    global.debug        = false;
    global.blinking     = false;
    global.checkpoint   = [32, 330, 0];
    global.died         = false;
	global.phighting    = [false, 0, 0]; // Fighting?, x min, x max
	global.hp           = 5;
	global.maxHp        = 5;
	global.idol         = [];
	global.roomCount    = 4;
	for(var i = 0; i < global.roomCount; i++){
		global.idol[i]  = false;
	}
	global.beatBoss     = [false];
	global.paused       = false;
	global.prevSpeed    = 1;
	global.pauseCount   = 0;
	global.parkourRooms = [1, 3];
    show_debug_message("Globals initialized");
}