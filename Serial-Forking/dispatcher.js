#Exemple de load balacing 


                # $Id: dispatcher.cfg,v 1.1 2004/08/10 16:51:36 dcm Exp $
                # sample config file for dispatcher module
                debug=2          # debug level (cmd line: -dddddddddd)
                #fork=yes
                fork=yes
                log_stderror=no  # (cmd line: -E)
                memdbg=5
                memlog=5
                log_facility=LOG_LOCAL0

                disable_tcp=yes
                children=4
                check_via=no      # (cmd. line: -v)
                dns=off           # (cmd. line: -r)
                rev_dns=off       # (cmd. line: -R)
                port=5060
                listen=udp:0.0.0.0:5060


                # ------------------ module loading ----------------------------------
                #mpath="modules_k:modules"
                mpath="/usr/local/lib64/kamailio/modules_k/:/usr/local/lib64/kamailio/modules/"
                loadmodule "tm.so"
                loadmodule "mi_fifo.so"
                loadmodule "sl.so"
                loadmodule "rr.so"
                loadmodule "pv.so"
                loadmodule "maxfwd.so"
                loadmodule "usrloc.so"
                loadmodule "textops.so"
                loadmodule "siputils.so"
                loadmodule "xlog.so"
                loadmodule "mi_rpc.so"
                loadmodule "dispatcher.so"
                loadmodule "ctl"

                # ----------------- setting module-specific parameters ---------------
                # ----- mi_fifo params -----
                modparam("mi_fifo", "fifo_name", "/tmp/kamailio_fifo")
                # ----- rr params -----
                # add value to ;lr param to cope with most of the UAs
                modparam("rr", "enable_full_lr", 1)
                # do not append from tag to the RR (no need for this script)
                modparam("rr", "append_fromtag", 0)
                # ----------------- setting module-specific parameters ---------------
                # ----- tm params -----
                modparam("tm", "fr_timer", 2000)
                modparam("tm", "fr_inv_timer", 40000)
                # -- dispatcher params --
                modparam("dispatcher", "list_file", "/usr/local/etc/kamailio/dispatcher.list")
                modparam("dispatcher", "flags", 3)
                modparam("dispatcher", "dst_avp", "$avp(i:271)")
                modparam("dispatcher", "grp_avp", "$avp(i:272)")
                modparam("dispatcher", "cnt_avp", "$avp(i:273)")
                modparam("dispatcher", "ds_ping_method", "OPTIONS")
                modparam("dispatcher", "ds_ping_interval", 30)
                modparam("dispatcher", "ds_probing_mode", 1) 
                modparam("dispatcher", "ds_probing_threshhold", 3) 

                route{
                       if ( !mf_process_maxfwd_header("10") )
                       {
                           sl_send_reply("483","To Many Hops");
                           drop();
                       };

                       if (is_method("INVITE") || is_method("REGISTER")) {
                           ds_select_domain("1", "4");
                         sl_send_reply("100","Trying");
                         forward();#uri:host, uri:port);

                           xlog("L_INFO","Redirect response URL constructed:  $ru\n");

                           sl_send_reply("302", "Moved Temporarily");
                           exit;
                       }
                }
                Here is my dispatcher.list file:

                #Load Balance
                1 sip:1.1.1.1:5060 2
                1 sip:2.2.2.2:5060 2

                #Fail Over if the above can't be used
                2 sip:3.3.3.3:5060 2


**use_default ( int )**

/*Si le paramètre est défini sur 1, la dernière adresse de l'ensemble de destination est utilisée comme option finale à laquelle envoyer la demande. Par exemple, il est utile lorsque vous souhaitez envoyer l'appel à un serveur d'annonce en disant: "les passerelles sont pleines, essayez plus tard".

La valeur par défaut est «0».

par exemple dans conversation.cfgmodparam("dispatcher", "use_default", 1)*/
