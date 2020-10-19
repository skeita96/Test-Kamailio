L'acheminement des demandes dans le cadre du dialogue est une partie assez réduite, car il n'y a pas de traitement complexe pour découvrir l'adresse du prochain saut, étant donné que la demande est acheminée par le mécanisme d'acheminement des enregistrements.
Le traitement commun des demandes consiste à : - bloc de routage [REQINIT]
- Blocage de l'itinéraire [NATDETECT]
- ANNULER le traitement
La fonctionnalité de cette partie est présentée dans le diagramme suivant :


Chacune de ces parties peut quitter le traitement du fichier de configuration, en arrêtant l'exécution à son niveau (par exemple, un message SIP cassé a été détecté par les contrôles de santé mentale).
CANCEL est géré dans cette partie en raison de certains dispositifs défectueux qui définissent le paramètre de balise d'en-tête To, ce qui les fait ressembler à une requête de dialogue within. Le CANCEL doit également être envoyé par le serveur SIP aux adresses où l'INVITE associé a été envoyé, information qui est stockée dans la transaction SIP et est utilisée directement par t_relay().
Le traitement des demandes dans le cadre d'un dialogue implique le traitement du routage des enregistrements et la comptabilisation de l'événement END des appels VoIP ou la gestion des demandes de dialogue pour le service de présence locale. Les règles de traitement NAT doivent également être appliquées aux demandes dans le cadre du dialogue. Dans cette section, nous nous occupons de l'ACK, qui peut être le corps du SDP, mais qui est transmis sans état (parce qu'il n'a pas de réponses), de sorte que la branche_route pour la traversée NAT n'est pas exécutée pour elle comme elle l'est pour les INVITÉS.
Une requête dans le dialogue est détectée par la présence de la valeur du paramètre de la balise d'en-tête To.
Les actions exécutées pour router les requêtes dans le dialogue sont regroupées dans le bloc route [WITHINDLG].

Il absorbe d'abord les retransmissions, puis procède à l'authentification et à l'autorisation (en route [AUTH]), enregistre le routage et marque les transactions pour la comptabilité. Il s'agit de règles de traitement communes pour les demandes initiales, à partir de là, les règles sont regroupées par type de service.
Ensuite, il y a la détection des services qui ne sont pas hébergés par cette instance Kamailio, en relayant les demandes vers les réseaux SIP étrangers sur la base du nom d'hôte DNS ou de l'adresse IP dans l'URI de la demande.
Seuls les services locaux sont ciblés après l'appel de route (SIPOUT). Parmi eux, le request_route commence à traiter les demandes qui se terminent sur cette instance de serveur SIP, respectivement les services de présence et de bureau d'enregistrement, dans la route [PRESENCE] et la route [REGISTRAR].
Les autres demandes SIP à traiter concernent les utilisateurs locaux ou les passerelles RTPC, il doit donc s'agir d'un nom d'utilisateur dans R-URI (qui est également l'extension composée pour les numéros RTPC).
route [PSTN] sélectionne les appels pour la passerelle RTPC sur la base d'une correspondance par expression régulière avec l'extension composée - elle doit commencer par "+" ou "00" et ne doit contenir que des chiffres. Vous pouvez ajuster la condition pour qu'elle corresponde à vos besoins. La connectivité RTPC n'est possible que si vous définissez une adresse IP de passerelle RTPC dans le paramètre global personnalisé "pstn.gw_ip".
Si les demandes ne concernent pas la passerelle RTPC, elles sont alors traitées par le service de localisation qui effectue la numérotation abrégée, les alias d'identité et la recherche de l'emplacement de l'utilisateur (en route [LOCATION]). Si l'utilisateur de destination n'est pas en ligne, il peut envoyer les appels à la messagerie vocale (si l'adresse du serveur de messagerie vocale est définie dans les paramètres globaux personnalisés).
Plus de détails sur les actions utilisées pour construire certaines des fonctionnalités du fichier de configuration par défaut sont présentés dans des sections dédiées plus loin dans ce livre, par exemple l'authentification de l'utilisateur, l'autorisation IP ou la traversée NAT.
Un bloc de sous-route est exécuté par le module xmlrpc lors de la réception d'une commande RPC. Par conséquent, les actions de ce bloc de route sont exécutées pour les requêtes HTTP, mais vous pouvez utiliser à l'intérieur de celui-ci la plupart des fonctions qui sont capables de traiter les requêtes SIP.
Le bloc branch_route [MANAGE_BRANCH] est utilisé pour la traversée NAT, pour engager le relais RTP via RTPProxy vers les branches sortantes des requêtes INVITE qui sont venues ou doivent passer par les routeurs NAT.
Le block reply_route [MANAGE_REPLY] a également pour rôle d'aider à la traversée NAT, en traitant les 180, 183 ou 200 réponses des INVITEs natted.
Le block reply_route [MANAGE_FAILURE] est utilisé pour détruire les sessions de relais RTP pour les INVITEs natted et présenter les exemples de remplacement des réponses de redirection 3xx et de renvoi d'appel vers le serveur de messagerie vocale en cas d'absence de réponse ou d'occupation de l'utilisateur.
Notez la présence de la déclaration IF qui vérifie si la transaction INVITE a été annulée par l'appelant :
923. 924. 925.
if (t_is_canceled()) { 
sortie ;
}
Il s'agit de saisir la situation lorsque l'appelant envoie un message d'ANNULATION avant que l'INVITE ne reçoive une réponse de 200 ok. L'effet de la demande d'ANNULATION est que l'INVITE reçoit

automatiquement une réponse 487, ce qui signifie que la transaction INVITE a échoué du point de vue du routage et que le bloc failure_route est exécuté pour elle.
Mais il est inutile d'essayer de réacheminer une INVITE qui a été annulée, car l'appelant est parti (si la nouvelle branche reçoit une réponse 200 OK, il y aura un appelé actif, mais pas d'appelant).
Assurez-vous de conserver cette condition dans chaque bloc failure_route où vous avez l'intention d'effectuer un réacheminement.


Le fichier de configuration par défaut est un très bon point de départ pour la plupart des déploiements impliquant Kamailio, les parties telles que le traitement initial, les demandes de routage au sein du dialogue ou l'authentification peuvent être facilement extraites et réutilisées.
Cependant, quelques exemples très simples peuvent aider à entrer dans la logique de la construction du fichier de configuration



## UN SIMPLE ÉQUILIBREUR DE CHARGE SANS ETAT

La logique de routage suivante est souhaitée :
- acheminer uniquement les demandes INVITE, pour le reste envoyer 404 non trouvé
- chaque processus Kamailio doit choisir la destination parmi deux adresses IP de manière circulaire
Chaque processus Kamailio doit stocker des informations sur le dernier serveur utilisé, pour les envoyer au suivant. Cela peut être fait en stockant l'index dans une variable de script stockant la valeur dans la mémoire privée :


              loadmodule “pv.so” 
              modparam("pv", "varset", "i=i:0") 
              request_route {
              if(!is_method(“INVITE”)) { 
              sl_send_reply(“404”, “Not Found”); exit;
              }
              $var(i) = ($var(i) + 1 ) mod 2; 
              if($var(i)==1) {
              rewritehostport(“1.2.3.4”); }
              else {
              rewritehostport(“2.3.4.5”); }
              forward(); 
              }

Le module pv est chargé pour pouvoir utiliser la pseudo-variable $var(i). Le paramètre varset du module est utilisé pour initialiser $var(i) à 0 (zéro) au démarrage (qui est la valeur initiale par défaut, mais il a été ajouté ici pour avoir un exemple explicite).
En fonction de la valeur de $var(i), le premier (1.2.3.4) ou le second (2.3.4.5) serveur sera utilisé pour la redirection. À chaque transfert, la valeur de $var(i) est incrémentée et une opération modulo 2 lui est appliquée pour rester dans la plage 0 ou 1.
La valeur de $var(i) est stockée en mémoire privée, elle est donc spécifique à chaque processus Kamailio. Elle persiste également lors du traitement de nombreuses requêtes SIP, n'étant pas attachée à une requête, mais faisant partie de l'environnement d'exécution.
Cet exemple construit un équilibreur de charge dans chaque processus de demande (souvenez-vous que Kamailio est une application multi-processus). Pour une politique d'équilibrage de charge round robin au niveau de l'instance de Kamailio, l'index du serveur à utiliser doit être conservé en mémoire partagée. Comme de nombreux processus peuvent le lire et le mettre à jour, l'accès à l'index doit se faire sous mutex (verrouillage) de synchronisation. Voici comment cela peut être fait :

                      loadmodule “sl.so”
                      loadmodule “textops.so”
                      loadmodule “pv.so”
                      loadmodule “cfgutils.so”
                      modparam("pv", "shvset", "i=i:0") 
                      modparam("cfgutils", "lock_set_size", 1) 
                      request_route {
                      if(!is_method(“INVITE”)) { 
                      sl_send_reply(“404”, “Not Found”);
                      exit;
                      }
                      lock(“balancing”);
                      $shv(i) = ($shv(i) + 1 ) mod 2; 
                      $var(x) = $shv(i); 
                      unlock(“balancing”);

                      if($var(x)==1) { 
                      rewritehostport(“1.2.3.4”);
                      } 
                      else { rewritehostport(“2.3.4.5”);
                      } 
                      forward();
}


La variable $shv(i) est utilisée pour stocker l'index du dernier serveur utilisé, étant une variable qui stocke sa valeur dans la mémoire partagée et est accessible à toutes les preuves d'application.
Le module Cfgutils a été chargé pour les fonctions lock()/unlock() qui offrent une implémentation mutex pour le fichier de configuration, afin de protéger l'accès à $shv(i). Une copie en mémoire privée de la valeur de $shv(i) est effectuée dans la zone protégée, en la stockant dans $var(x). De cette façon, la zone de verrouillage protège l'incrémentation de l'index et le clonage de la valeur en mémoire privée, opérations qui sont très rapides. La mise à jour de l'adresse URI de la requête et la redirection peuvent être effectuées en dehors de la zone de verrouillage.
Notez que comme cette configuration ne fait pas de routage d'enregistrement, la requête dans le dialogue ne doit pas passer par notre serveur.
Si vous remplacez forward() par sl_send_reply("302", "Moved Temporarily") dans la configuration ci-dessus, vous obtenez un serveur de redirection SIP à répartition de charge.


## ÉQUILIBREUR DE CHARGE SIMPLE **STATEFUL** ROUND-ROBIN

L'objectif est de mettre à jour le fichier de configuration précédent afin d'effectuer un transfert d'état et un routage d'enregistrement, en forçant toutes les requêtes dans le dialogue à passer par notre serveur. De cette façon, les demandes d'annulation peuvent être acheminées correctement par un équilibreur de charge round-robin.



                      loadmodule “rr.so”
                      loadmodule “tm.so”
                      loadmodule “sl.so”
                      loadmodule “textops.so”
                      loadmodule “pv.so”
                      loadmodule “cfgutils.so”
                      loadmodule “siputils.so” 
                      modparam("pv", "shvset", "i=i:0")
                      modparam("cfgutils", "lock_set_size", 1)
                      request_route {
                      if (is_method("CANCEL")) {
                      if (t_check_trans()) 
                      t_relay();
                      exit; }
                      route(WITHINDLG);

                      if(!is_method(“INVITE”)) { 
                      sl_send_reply(“404”, “Not Found”); exit;
                      }
                      t_check_trans(); 
                      lock(“balancing”);
                      $shv(i) = ($shv(i) + 1 ) mod 2; 
                      $var(x) = $shv(i); 
                      unlock(“balancing”); 
                      if($var(x)==1) {
                      rewritehostport(“1.2.3.4”); }
                      else {
                      rewritehostport(“2.3.4.5”); }
                      record_route();
                      route(RELAY); 
                      }
                      #generic stateful forwarding wrapper 
                      route[RELAY] {
                      if (!t_relay()) { sl_reply_error();
                      } }
                      #route requests within SIP dialogs route[WITHINDLG] {
                      if (has_totag()) {
                      if (loose_route()) {
                      route(RELAY);
                      } 
                      else {
                      sl_send_reply("404","Not here");
                      }
                      exit; 
                        }
                      }




Trois nouveaux modules ont été chargés :
- tm - pour avoir accès aux fonctions d'expédition de l'état 
- rr - pour avoir accès aux fonctions d'acheminement des enregistrements
- siputils - pour accéder à la fonction has_totag()
Les nouvelles parties ajoutées à la configuration sont :
- routage des demandes ANNULER les demandes au début du bloc request_route
- routage au sein des demandes de dialogue via le bloc de routage [WITHINDLG], en utilisant un mécanisme de routage souple
- absorber la retransmission avec la fonction t_check_trans()


## ÉQUILIBREUR DE CHARGE AVEC ROUTAGE DE DÉFAILLANCE

La configuration suivante met en œuvre un routage de défaillance pour l'équilibreur de charge de la section précédente. Si le premier serveur sélectionné répond avec 408 ou 500 réponses, alors on essaie d'envoyer à l'autre. Un autre ajout consiste à autoriser les appels entrants uniquement à partir des réseaux 3.4.5.6/24 et 4.5.6.7/24.

              loadmodule “rr.so”
              loadmodule “tm.so”
              loadmodule “sl.so”
              loadmodule “textops.so”
              loadmodule “pv.so”
              loadmodule “cfgutils.so”
              loadmodule “siputils.so”
              modparam("tm", "failure_reply_mode", 3) 
              modparam("pv", "shvset", "i=i:0") 
              modparam("cfgutils", "lock_set_size", 1)
              request_route {
                  if (is_method("CANCEL")) {
                  if (t_check_trans()) 
                      t_relay();
                      exit; 
                   }
                  route(WITHINDLG);
                  if(!is_method(“INVITE”)) { 
                  sl_send_reply(“404”, “Not Found”); 
                  exit;
                  }
                  if( ! ( src_ip==3.4.5.6/24 || src_ip==4.5.6.7/24 ) ) {
                  sl_send_reply(“403”, “Forbidden”);
                  exit;
                  }
                  t_check_trans(); 
                  lock(“balancing”);
                  $shv(i) = ($shv(i) + 1 ) mod 2;
                  $var(x) = $shv(i); 
                  unlock(“balancing”); 
                  if($var(x)==1) {
                  rewritehostport(“1.2.3.4”);
                  } else { rewritehostport(“2.3.4.5”);
                    }
                    record_route();
                    $avp(idx) = $var(x); t_on_failure(“REROUTE”); route(RELAY);
                    }
                    #generic stateful forwarding wrapper route[RELAY] {
                    if (!t_relay()) { 
                    sl_reply_error();
                    }
                    }
                    #route requests within SIP dialogs 
                    route[WITHINDLG] {
                    if (has_totag()) {
                    if (loose_route()) {
                    route(RELAY); } 
                    else {
                    sl_send_reply("404","Not here"); }
                    exit; 
                    }
                    } 
                    failure_route[MANAGE_FAILURE] {
                    if (t_is_canceled()) { 
                    exit;
                    } 
                    if(!t_check_status(“408|500”)
                    exit; 
                    if($avp(idx)==0) {
                    rewritehostport(“1.2.3.4”); } 
                    else {
                    rewritehostport(“2.3.4.5”); }
                    route(RELAY); 
                }




Dans le bloc request_route, avant le relais, l'index du serveur utilisé est stocké dans $avp(idx) et le failure_route [REROUTE] est joint à la transaction.
Le $avp(idx) est une variable qui stocke la valeur en mémoire partagée et qui est attachée à la transaction. Sa valeur est disponible à tout moment lors du traitement des messages relatifs à la même transaction. Les AVP sont automatiquement détruits lorsque la transaction est détruite.
Dans le bloc failure_route, si le code renvoyé est 408 ou 500, l'adresse dans l'URI de la requête est remplacée par l'IP de l'autre serveur. Cette fois, il n'y a pas de bloc failure_route attaché
avant le relais, ce qui signifie que la réponse du second serveur est envoyée en amont sans aucune tentative de réacheminement.
Le trafic des appels entrants est autorisé sur la base des conditions src_ip.


## REMARQUES

À partir d'un fichier de configuration très simple, nous avons construit un équilibrage de charge de base équitable avec la possibilité d'autoriser le trafic en fonction de l'IP source et de faire un réacheminement en cas de défaillance de la destination.
Le fichier de configuration de Kamailio peut être considéré comme un langage logique pour le routage SIP. Il faut se mettre à la place de Kamailio. Vous recevez un paquet du réseau, vous devez voir quel est le type de paquet, si vous savez déjà où l'envoyer, faites-le immédiatement. Si ce n'est pas le cas, regardez les options dont vous disposez pour l'acheminement.
Assurez-vous tout d'abord qu'il provient d'un expéditeur de confiance, afin de ne pas envoyer de déchets à des pairs qui vous font confiance. Essayez de l'envoyer via les canaux de communication auxquels vous avez accès, en utilisant l'autre si le premier sélectionné n'a pas réussi à livrer.
En d'autres termes, Kamailio est le cadre de routage SIP, l'armée fidèle, et vous êtes le cerveau qui contrôle le routage, le commandant suprême.

## Drapeaux de configuration

### CONCEPT
Flags est un terme qui se réfère à un ensemble de 32 bits. La structure de données pour stocker les drapeaux est un entier non signé. L'image suivante montre la représentation binaire de la structure des drapeaux :























