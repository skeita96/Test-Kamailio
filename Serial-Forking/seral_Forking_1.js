 # Premier essai de la Serial forking avec mon binôme 
 @@@@@@@@@@@@ C'EST BON  @@@@@@@@@@@@@@@@@@@@@ 
	
	
route {

	# CANCEL processing
	if (is_method("CANCEL")) {
		if (t_check_trans()) {
			route(RELAY);
		}
		exit;
	}

	# handle retransmissions
	if (!is_method("ACK")) {
		if(t_precheck_trans()) {
			t_check_trans();
			exit;
		}
		t_check_trans();
	}

	# record routing for dialog forming requests (in case they are routed)
	# - remove preloaded route headers
	remove_hf("Route");
	if (is_method("INVITE|SUBSCRIBE")) {
		record_route();
	}

	# handle registrations
	route(REGISTRAR);

	if ($rU==$null) {
		# request with no Username in RURI
		sl_send_reply("484","Address Incomplete");
		exit;
	}

	# Serial forking
	route(SERIAL);

}


# Writting functionn space

route[SERIAL]{
   $ru = "sip:200@51.210.54.81:5060";
    xlog("ALERT : new request uri $ru \n");
    t_on_failure("1");
    route(LOCATE);
}

failure_route[1] {
    if(t_is_canceled()) {
        exit;
    }
    
    xlog(" an other alternative \n");

    if(t_check_status("486|408")){
        $ru = "sip:203@51.0.0.1:5060";
        xlog(" an other uri $ru \n");
        t_on_failure("2");
        route(LOCATE);
    }
}

failure_route[2] {
    if(t_is_canceled()) {
        exit;
    }
    
    xlog(" an other alternative \n");

    if(t_check_status("486|408")){
        rewriteuri("sip:8002@51.0.0.2:5060");
        xlog(" Rewrited to $ru \n");
        t_on_failure("3");
        route(LOCATE);
        exit;
    }
}

failure_route[3] {
    if(t_is_canceled()) {
        exit;
    }
    xlog( "nobody available \n");
    t_reply("500", "Server error"); 
}

route[LOCATE]{
	if(lookup("location")){
		route(RELAY);
		exit;
	}
	route(RELAY);
	exit;
}
