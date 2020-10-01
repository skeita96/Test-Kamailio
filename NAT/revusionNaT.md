Le folklore traditionnel de l'ère OpenSER et du début du Kamailio prescrit l'utilisation des fonctions **fix_nated_contact()** et **les fix_nated_register()** . On peut encore les trouver dans de nombreux livres et documentations:

**fix_nated_contact()** réécrit la partie domaine de l'URI Contact pour contenir l'adresse IP source et le port de la demande ou de la réponse.

fix_nated_register()est destiné aux REGISTERdemandes, il n'est donc pertinent que si vous utilisez Kamailio en tant que registraire ou que vous transférez les enregistrements en avant (c'est-à-dire en utilisant Path). Il adopte une approche plus délicate, en stockant l'adresse IP et le port source réels dans le received_avp, où ils peuvent être récupérés par les recherches du bureau d'enregistrement et définis comme ensemble de destination , terme de Kamailio pour la destination de transfert du prochain saut (remplacement du domaine et du port de l'URI de la demande).

fix_nated_register()n'est généralement pas problématique, bien qu'elle nécessite une AVP partagée avec le registrarmodule. D'un point de vue sémantique, cependant, fix_nated_contact()est profondément problématique, en ce qu'il modifie l'URI de contact et provoque donc la construction d'un URI de requête, dans les demandes entrantes au client NAT, qui ne sont pas équivalentes à l'URI de contact qui y est peuplé par le client. La RFC 3261 dit que vous ne ferez pas cela.

Les nathelperoffres de meilleurs idiomes pour faire face à cette mutilation de nos jours: handle_ruri_alias()et set_contact_alias()/ add_contact_alias. En utilisant ces fonctions, ceci:

          Contact: <sip: alex-balashov@172.30.105.251: 5060>
          
 Ce transforme en ceci :
          
         Contact: <sip: alex-balashov@172.30.105.251: 5060;;alias=47.39.154.156~5060~1>
         
  et stocké (si REGISTER) ou transmis (autre chose). Lorsqu'il handle_ruri_alias()est appelé, le ;aliasparamètre est supprimé et son contenu est renseigné dans l' URI de destination . Ce qui est beau, handle_ruri_alias()c'est que si le ;aliasparamètre n'est pas présent, il revient silencieusement sans aucune erreur. Cela simplifie le code en supprimant la nécessité d'une vérification explicite de ce paramètre.

Par souci de simplicité et d'intrusion minimale, je recommande fortement d'utiliser ces fonctions à la place des anciennes fix_*()fonctions.

### LA MISE EN OEUVRE
Près du haut de la principale request_route, vous voudrez probablement avoir un sous-programme global qui vérifie le NAT. À ce stade, la logique ne sera pas spécialisée en fonction de la méthode de demande ou du fait que la demande contienne un corps SDP encapsulé. De manière critique, assurez-vous que cela se produit avant toute vérification d'authentification / AAA, car les défis 401/407, ainsi que toutes les autres réponses, doivent être acheminés vers le bon endroit en fonction de force_rport():  

                 
                           if(nat_uac_test("18")) {
                                force_rport();

                                if(is_method("INVITE|REGISTER|SUBSCRIBE"))
                                   set_contact_alias();
                             }                

Plus tard, dans la loose_route()section qui traite de la gestion des ré-invitations et d'autres demandes dans la boîte de dialogue, vous devrez engager RTPEngine et gérer tout présent ;aliasdans l'URI de la demande:





                if(has_totag()) {
                      if(loose_route()) {
                         if(is_method("INVITE|UPDATE") && sdp_content() && nat_uac_test("18"))
                             rtpengine_manage("replace-origin replace-session-connection ICE=remove");

                         ...

                         handle_ruri_alias();

                         t_on_reply("MAIN_REPLY");

                         if(!t_relay())
                            sl_reply_error();

                         exit;
                      }
                   }


La gestion initiale de INVITE est similaire:



              request_route {
                 ...

                 if(has_totag()) {
                    ...
                 }

                 ...

                 t_check_trans();

                 if(is_method("INVITE")) {
                    if(nat_uac_test("18") && sdp_content()) 
                       rtpengine_manage("replace-origin replace-session-connection ICE=remove");

                    t_on_reply("MAIN_REPLY");

                    if(!t_relay())
                       sl_reply_error();

                    exit;
                 }

Pour tenir compte du cas où les demandes sont entrantes vers le point d'extrémité NAT ou le cas où les points d'extrémité NAT s'appellent directement, un **onreply_route** devra être armé pour toute transaction impliquant une partie NAT. Sa logique devrait être similaire:

              onreply_route[MAIN_REPLY] {
                 if(nat_uac_test("18")) {
                    force_rport();
                    set_contact_alias();

                    if(sdp_content()) 
                       rtpengine_manage("replace-origin replace-session-connection ICE=remove");
                  }

              }


Pour le passage en série vers plusieurs passerelles potentielles, il est fortement recommandé de placer les appels initiaux à RTPEngine dans un branch_route(), afin que RTPEngine puisse recevoir les données de branche les plus à jour et potentiellement prendre des décisions au niveau de la branche.

Les demandes d'enregistrement sont déjà traitées par la strophe générale de détection NAT ci-dessus. Cependant, l'enregistrement _lookups_ nécessite une nuance supplémentaire:

                        route[REGISTRAR_LOOKUP] {
                           ...

                           if(!lookup("location")) {
                              sl_send_reply("404", "Not Found");
                              exit;
                           }

                           handle_ruri_alias();

                           if(!t_relay())
                              sl_reply_error();

                           exit;
                        }



C'est vraiment ça!


### QU'EN EST-IL DES SERVEURS NAT?
Dans les environnements cloud et VPS, il devient assez courant d'avoir une adresse IP privée hébergée nativement sur l'hôte avec une adresse IP publique externe fournie via 1-to-1 NAT.

La listendirective de base de Kamailio a un paramètre pour aider à cela:

                  listen = udp: 192.168.2.119: 5060 annonce 70.1.2.1:5060


Cela garantira que les en Via- Record-Routetêtes et font référence à l'adresse IP publique plutôt qu'à l'adresse privée. Cela n'a aucun impact sur RTP.


### PONTAGE DE TOPOLOGIE AVEC RTPENGINE + NAT
L'observateur averti notera que les invocations précédentes de rtpengine_manage()ne répondaient pas à une exigence clé de la topologie de réseau décrite dans le diagramme, la nécessité de relier deux topologies de réseau disparates.

Cela nécessite deux interfaces de transfert RTPEngine différentes, dont l'une a une adresse IP publique via 1-to-1 NAT. Ce dernier semblerait exiger quelque chose comme une advertisedirective, mais pour RTP. Heureusement, RTPEngine a une telle option, appliquée avec le ! délimiteur:

              OPTIONS="-i internal/192.168.2.220 -i external/192.168.2.119!70.1.2.1
              
  L'attribut de direction to rtpengine_offer()(ou, de manière équivalente, l'appel initial à rtpengine_manage()) permet de spécifier respectivement les interfaces d'entrée et de sortie:

  
              rtpengine_manage("replace-origin replace-session-connection ICE=remove direction=internal direction=external");
  les appels ultérieurs à rtpengine_manage(), y compris les appels entrants onreply_route, prendront correctement en compte cet état et inverseront l'ordre d'interface pour le flux de retour si nécessaire.
  
  
## KEEPALIVES ET TIMEOUTS            


Le défi le plus courant avec les points de terminaison SIP NAT est qu'ils doivent rester joignables de manière persistante; ils peuvent recevoir des appels entrants ou d'autres messages à tout moment dans le futur.

Rappelez-vous que les passerelles NAT ajoutent des mappages pour les connexions ou les flux de type connexion (dans le cas d'UDP, rappelez-vous qu'à des fins NAT, UDP n'est pas vraiment «sans connexion») qu'elles détectent, par exemple de 192.168.0.102:5060 à $ WAN_IP: 43928. Pendant le temps que ce dernier mappage existe, tout UDP envoyé à $ WAN_IP: 43928 sera renvoyé à 192.168.0.102:5060.

Le problème est que ce mappage est supprimé après des périodes d'inactivité relativement courtes. En principe, c'est une bonne chose; vous ne voudriez pas que la mémoire de votre passerelle NAT soit remplie de «connexions» éphémères qui ont depuis longtemps cessé d'être pertinentes. Cependant, alors que, d'après notre expérience, la plupart des délais d'attente pour les flux UDP sont de l'ordre de quelques minutes, il existe certains routeurs dont la «mémoire» pour les flux UDP peut être exceptionnellement faible - une minute ou moins. La même chose est vraie pour TCP, mais UDP a tendance à être affecté de manière plus flagrante.

Lorsque le «mappage» de suivi de connexion disparaît, la passerelle NAT abandonne les paquets entrants vers l'ancienne destination $ WAN_IP: 43928 à l'étage. Prenons cet exemple:

Illustration .....


Dans cette topologie de test, 10.150.21.6 est un PBX Freeswitch sur un réseau privé (10.150.21.0/24) qui reçoit des enregistrements relayés de Kamailio (avec l'aide de l'en- tête Path ). Kamailio est multi-hébergé sur une interface privée (10.150.20.2) et publique (209.51.167.66), cette dernière étant présentée aux téléphones extérieurs.

Un enregistrement qui a eu lieu environ 15 minutes auparavant avait établi une liaison de contact de 47.39.154.156:5060 pour mon AOR (Address of Record). Cependant, comme aucune activité ne s'était produite dans ce flux depuis aussi longtemps, le routeur NAT l'a «oublié», et vous pouvez que les efforts pour atteindre le téléphone n'aboutissent à rien. Un message ICMP de type 3 (port inaccessible) (non affiché) est renvoyé à Kamailio et c'est la fin.

Ainsi, pour garder les «trous d'épingle» NAT - comme on les appelle souvent - ouverts, un moyen de générer une activité fréquente sur le flux mappé est nécessaire.

La solution la plus simple et la plus simple consiste à réduire l'intervalle de réenregistrement de chaque appareil NAT à environ 60 ou 120 secondes; cela générera un échange de messages bidirectionnel ( REGISTER, 401défi, 200 OK) qui «renouvellera» le trou d'épingle. Ceci est efficace dans de nombreux cas. Mais il y a deux problèmes:

L'intervalle ne peut pas être trop bas - De nombreux appareils ou bureaux d'enregistrement SIP ne prendront pas en charge un intervalle de réenregistrement de moins de 60 secondes, et croyez-le ou non, ce n'est pas assez bas pour certains des violateurs les plus flagrants parmi les passerelles NAT .
Problèmes de performance pour le fournisseur de services - Dans un moment sympathique, considérez les choses du point de vue de votre fournisseur de services SIP: des dizaines de milliers (ou plus) d'appareils se heurtent à un SBC ou un proxy de périphérie - et avec des enregistrements pas moins, qui sont plutôt chers opérations qui impliquent généralement une sorte d'implication de base de données pour l'authentification et le stockage persistant. Cela peut changer considérablement l'économie opérationnelle. Par conséquent, par principe, autoriser ou encourager des intervalles de réenregistrement aussi faibles peut ne pas être souhaitable.
Entrez le «keepalive», un message envoyé par le serveur ou le client qui recueille une sorte de réponse de l'autre partie. Les Keepalives sont une amélioration par rapport aux enregistrements en ce qu'ils ne sont pas gourmands en ressources, car ils n'invitent qu'une réponse superficielle d'une pile SIP.

Il existe deux types de keepalives couramment utilisés dans le monde SIP: (1) un message CRLF (retour chariot) de base, court et doux, et (2) une OPTIONSrequête SIP . Bien OPTIONSqu'il ait apparemment un objectif formel différent, interroger une partie SIP pour ses capacités, il est fréquemment utilisé comme message DPD (keepalive ou dead peer detection).

De nombreux appareils des utilisateurs finaux peuvent envoyer ces keepalives, et si votre environnement d'appareil d'utilisateur final est suffisamment homogène et que vous exercez un contrôle de provisionnement élevé sur celui-ci, vous souhaiterez peut-être le configurer de cette manière et demander simplement à Kamailio d'y répondre. Dans le cas des OPTIONS pings, vous voudrez configurer Kamailio pour y répondre par l'affirmative 200 OK:


                 if(is_method("OPTIONS")) {
                        options_reply();
                        exit;
                    }


Cela va dans la section de gestion des demandes initiale, vers le bas de la route de demande principale.

Conseil de pro: la plupart des appareils des utilisateurs finaux enverront un OPTIONSmessage avec un URI de demande qui a une partie utilisateur, c'est-à-dire


                    OPTIONS sip: test@server.ip: 5060 SIP / 2.0
                    
Il y a un débat valable pour savoir si cela est approprié, car, à proprement parler, cela implique que le OPTIONSmessage est destiné à une «ressource» particulière (par exemple, adresse d'enregistrement / autre utilisateur) sur ce serveur, plutôt que le serveur lui-même. Néanmoins, c'est ainsi que OPTIONSsont construits de nombreux messages. Le siputilsmodule Kamailio , qui assure la options_reply()fonction, prend une interprétation fondamentaliste dans ce débat, ce qui nuira à de nombreuses réponses.

Solution de contournement légèrement peu orthodoxe, mais efficace, car les applications keepalive du OPTIONSmessage se soucient rarement du contenu réel de la réponse:



                if(is_method("OPTIONS")) {
                     sl_send_reply("200", "OK");
                     exit;
                  }

Cependant, vous pouvez trouver plus de profit dans le ping keepalive lancé par le serveur. Le nathelpermodule Kamailio fournit également des options étendues pour cela. Commencez par la section ping NAT .

## FRAGMENTATION UDP



Au fil du temps, la taille médiane des messages SIP a tendance à augmenter: les strophes SDP s'agrandissent à mesure que davantage de codecs sont proposés, de nouveaux en-têtes et attributs SIP entrent en service, etc.

Lorsque la taille de la charge utile d'un message UDP atteint une petite marge du MTU (généralement 1500 octets), il est fragmenté. UDP ne fournit pas de réassemblage au niveau du transport comme le fait TCP. Étant donné que seul le premier fragment contiendra l'en-tête UDP, il faut beaucoup d'intelligence pour réassembler le message. La pile SIP de Kamailio peut, bien sûr, le faire, comme beaucoup d'autres dans le monde FOSS traditionnel. Cependant, de nombreux agents utilisateurs ne le peuvent pas.

Plus accablant, il y a pratiquement zéro pour cent de chances qu'une passerelle NAT gère correctement la fragmentation UDP. Ainsi, en règle générale, il est tout à fait sûr de supposer qu'un point de terminaison NAT ne recevra pas un message SIP fragmenté.

Les stratégies pour faire face à ce phénomène sont détaillées dans un article séparé consacré à la fragmentation UDP sur ce blog , mais la réponse courte est: utilisez TCP. C'est ce que RFC 3261 dit de faire.

## QU'EN EST-IL DU SIP SORTANT?

La RFC 5626 , connue sous le nom de «SIP Outbound», est le dernier opus de la copieuse production intellectuelle de l'IETF sur ces sujets. Comme c'est le cas pour de nombreuses entreprises aussi complexes, Kamailio l'a soutenu pendant longtemps, mais la plupart des UA SIP dans la nature le font rarement.

En bref, SIP Outbound propose l'établissement de multiples flux de connexion simultanés par le client pour la redondance. Un principe de base de cet arrangement est que toute responsabilité pour l'établissement de connexions via NAT, ainsi que toute la maintenance et l'entretien de celui-ci, est la responsabilité du client. Il y a beaucoup d'autres détails impliqués, principalement liés au fait que le bureau d'enregistrement n'utilise qu'un seul des «flux» à la fois pour atteindre un client avec plusieurs enregistrements, de sorte que les enregistrements multiples établis pour la redondance ne conduisent pas à plusieurs INVITE fourchus vers le client. Certains nouveaux paramètres sont impliqués dans cette nouvelle couche de bureaucratie pour le registraire: instance-idet reg-id.



Un exposé complet de la façon dont tout cela fonctionne dépasse certainement le cadre de cet article, mais la RFC 5626 est une lecture captivante au coucher. Cependant, jusqu'à ce que et à moins que le support UA généralisé n'apparaisse, cet auteur ne peut pas être déplacé pour dire: «Utilisez SIP Outbound, cela résoudra vos problèmes de traversée NAT!

## OPTIMISATION DE KAMAILIO POUR UN DÉBIT ET DES PERFORMANCES ÉLEVÉS

Le débit de traitement des messages SIP inégalé est l'une des principales revendications de renommée de Kamailio . En ce qui concerne les configurations d'appels par seconde («CPS») ou les messages SIP par seconde, il n'y a rien de plus rapide que la pile technologique OpenSER. Naturellement, nous répercutons cet avantage dans la proposition de valeur de  CSRP , notre plateforme de routage, de notation et de comptabilité «Classe 4» basée sur Kamailio.

C'est un différenciateur important par rapport à de nombreux commutateurs logiciels traditionnels, SBC et B2BUA, dont certains sont connus pour tomber avec aussi peu que 100 CPS de trafic, et bien d'autres pour plafonner à quelques centaines de CPS répartis sur toute l'installation. Il façonne l'évolutivité horizontale et la densité de ports de ces plates-formes et, par conséquent, l'économie unitaire pour les acteurs de l'entreprise: les coûts de licence par port, le dimensionnement des serveurs et, en fin de compte, les marges brutes dans un monde où les coûts de terminaison du RTPC augmentent rapidement et le trafic de courte durée - adorez-le, détestez-le - joue un rôle évident dans le prospectus de l'industrie ITSP.

C'est pourquoi il vaut la peine de prendre le temps de comprendre comment Kamailio fait ce qu'il fait, et ce que cela signifie pour vous en tant qu'implémenteur (ou client potentiel du CSRP ? :-).

## ARCHITECTURE DE CONCURRENCE KAMAILIO

Kamailio n'utilise pas de threads en tant que tels. Au lieu de cela, quand il démarre, ce fork()sont des processus enfants qui sont spécialisés dans les rôles de récepteurs de paquets SIP. Ce sont de  véritables  processus indépendants, et bien qu'ils puissent être communément appelés «threads», ce ne sont pas des threads POSIX et, de manière critique, n'utilisent pas les mécanismes de verrouillage et de synchronisation des threads POSIX. Processus enfants Kamailio communiquent entre eux (communication interprocessus, ou « IPC ») en utilisant la mémoire partagée System V . Nous allons appeler ces «processus récepteurs» pour le reste de l'article, puisque c'est ce que Kamailio lui-même appelle.

Le nombre de processus récepteurs à générer est régi par la children=directive de configuration principale.  Cette valeur est multipliée par le nombre d'interfaces d'écoute et de transports. Par exemple, dans la sortie ci-dessous, j'ai mon childrenensemble sur 8, mais comme j'écoute sur deux interfaces réseau ( 209.51.167.66et 10.150.20.2), il y a huit processus pour chaque interface. Si j'ai activé SIP sur TCP ainsi que UDP, le nombre serait 32. Mais une installation plus typique aurait simplement 8:


Illustration .....



(Il existe d'autres processus enfants en plus des récepteurs, mais ils sont auxiliaires - ils n'effectuent pas la fonction principale de Kamailio de traitement des messages SIP. Plus d'informations sur les autres processus plus tard.)

Vous pouvez considérer ces processus de réception comme quelque chose comme des «voies de circulation» pour les paquets SIP; autant de «voies» qu'il y en a, c'est le nombre de messages SIP qui peuvent être entassés sur «l'autoroute» en même temps:


l s'agit plus ou moins de la conception standard du «pool de threads» statique. Pour les charges de travail à faible latence et à volume élevé, il s'agit probablement de l'option disponible la plus rapide. Étant donné que la taille du pool de nœuds de calcul ne change pas, la surcharge de démarrage et d'arrêt des threads est constamment évitée. Ce qui s'applique à la gestion de pool de threads statiques en général s'applique également ici.

Bien entendu, la synchronisation, les verrous d'exclusion mutuelle («mutex») qui garantissent que plusieurs threads n'accèdent pas et ne modifient pas les mêmes données en même temps de manière contradictoire, est le fléau de la programmation multiprocessus, quelle que soit la forme des processus. L'avantage du parallélisme de plusieurs threads est miné lorsqu'ils passent tous beaucoup de temps à bloquer, en attendant que les verrous mutex détenus par d'autres threads s'ouvrent avant que leur exécution puisse continuer. Pensez à une route à plusieurs voies où chaque voiture change constamment de voie; il y a beaucoup d'attente, de reconnaissance et de coordination qui doivent se produire, menant inévitablement à un ralentissement ou à un embouteillage. La conception idéale est «sans partage», où chaque voiture reste toujours dans sa propre voie - c'est-à-dire où chaque thread peut fonctionner de manière plus ou moins autonome sans partage compliqué (et par conséquent,

Le design de Kamailio est ce que vous pourriez appeler «partager le moins possible»; tandis que certaines structures de données et autres constructions ( AVP ,  XAVP , transactions SIP , état de dialogue ,  htable, etc.) sont inévitablement globaux (sinon ils ne seraient pas très utiles), résidant dans l'espace IPC de mémoire partagée accessible par tous les threads récepteurs, une grande partie de ce dont chaque processus récepteur a besoin pour fonctionner sur un message SIP est la propriété de ce processus. Par exemple, chaque processus enfant reçoit son propre descripteur de connexion aux bases de données et aux magasins de valeurs-clés (par exemple MySQL, Redis), supprimant ainsi le besoin de regroupement de connexions communes (et conflictuelles). En plus du pool de mémoire partagée utilisé par tous les processus, chaque processus enfant reçoit une petite «zone de travail» de mémoire où des données éphémères à court terme (telles que les variables de configuration $ var (…) ) ainsi que des données propriétaires de processus persistantes vies. (Ceci est appelé «mémoire de package» dans Kamailio, et est défini avec l' -Margument de ligne de commande lors de l'invocation, par opposition à-m, qui définit la taille du pool de mémoire partagée.)

Bien sûr, les résultats réels dépendront des fonctionnalités de Kamailio que vous utilisez et de la mesure dans laquelle vous les utilisez. Presque toutes les applications utiles de Kamailio impliquent l'état des transactions, vous pouvez donc vous attendre, au minimum, à ce que les transactions soient partagées. Si, par exemple, votre traitement est basé sur une base de données, vous pouvez vous attendre à ce que les processus récepteurs fonctionnent de manière plus indépendante que si votre traitement est fortement lié à des constructions de mémoire partagée telles que htableou pipelimit.

De plus, contrairement à l'architecture que l'on trouve dans de nombreux programmes classiquement multithread avec cette conception de «pool de threads», il n'y a pas de thread «distributeur» qui répartit les paquets entrants. Au lieu de cela, chaque processus enfant appelle recvfrom()( accept()ou autre) sur la même adresse de socket. Le noyau du système d'exploitation lui-même distribue les paquets entrants aux processus enfants à l'écoute d'une manière semi-aléatoire qui, en quantités statistiquement importantes, est sensiblement similaire au «round-robin». C'est une approche simple et directe qui exploite la propre file d'attente de paquets du noyau et élimine la complexité d'un processus de supervision pour rassembler les données.


## COMBIEN D'ENFANTS À AVOIR?
Naturellement, les discussions sur les performances et le débit se tournent tôt ou tard vers:

Quelle valeur «enfants» dois-je utiliser pour obtenir les meilleures performances?

C'est un sujet très débattu, et probablement l'une des FAQ les plus courantes sur la liste de diffusion des utilisateurs de Kamailio  . La  configuration de stock est livrée  avec une valeur de 8, ce qui amène beaucoup de gens à se demander: pourquoi si bas? À première vue, il va sans dire que sur un système chargé, plus il y a de processus enfants, mieux c'est. Cependant, ce n'est pas exact.

La raison pour laquelle la réponse est compliquée est que cela dépend de votre matériel et, plus important encore, de la charge de travail de Kamailio.

Avant d'aller de l'avant, définissons un terme: «threads matériels disponibles». Pour nos besoins, il s'agit du nombre «d'apparitions» de CPU dans /proc/cpuinfo. Cela prend en compte les cœurs «logiques» créés par l' hyper-threading .

Par exemple, j'ai un ordinateur portable double cœur avec quatre «processeurs» logique


ligne de sortie de commande .....

Dans ce cas, notre nombre de threads matériels disponibles est de 4.

En principe, le nombre de processus enfants qui peuvent utilement s'exécuter en parallèle est égal au nombre de threads matériels disponibles (dans le /proc/cpuinfosens). Etant donné une configuration Kamailio purement statique sur un système de threads 8-HW, 8 processus récepteurs auront 8 affinités "CPU" différentes et attribueront aux processeurs autant de paquets que le matériel peut en traiter utilement. Une telle configuration peut gérer des dizaines de milliers de messages par seconde, et les limites que vous rencontrerez éventuellement sont plus susceptibles d'être liées à des conflits d'E / S dans l'espace utilisateur ou des problèmes de trames par interruption ou de tampon matériel de la carte réseau qu'avec Kamailio lui-même.

Une fois que vous augmentez le nombre de processus récepteurs au-delà de cela, les processus excédentaires se battront pour le même nombre de threads matériels, et vous serez plus touché par l'inconvénient de ce conflit de planification de l'espace utilisateur et de la quantité limitée de verrouillage de mémoire partagée qui le fait. existent dans Kamailio que vous bénéficierez de l'avantage de plus de processus.

Cependant, la plupart des applications utiles de Kamailio n'impliquent pas de fichier de configuration codé en dur, mais plutôt des interactions d'E / S externes avec des systèmes externes: bases de données, magasins de valeurs clés, services Web, programmes intégrés, etc. Attendre le retour d'un appel d'E / S externe, tel qu'une requête SQL à MySQL, est un processus synchrone  (ou  bloquant ); tandis que le thread récepteur attend que la base de données réponde, il reste là à ne rien faire. Il est bloqué et ne peut plus traiter les messages SIP. Il est prudent de dire que la latence de traitement de bout en bout pour tout message SIP donné est déterminée par l'attente d'E / S cumulée impliquée dans le traitement. Ces opérations sont appelées opérations liées aux E / S. La plupart de ce que fait un déploiement Kamailio typique est en quelque sorte lié aux E / S.

C'est là que vous devez prendre une réduction par rapport au débit maximal idéalisé susmentionné de Kamailio, et c'est généralement assez raide. La question est rarement: "Combien de messages SIP par seconde Kamailio peut-il gérer?" La bonne question est: «Combien de messages SIP par seconde Kamailio peut-il gérer avec votre script de configuration et les dépendances d'E / S externes? «Il va de soi que, étant donné un pool de threads de réception de taille fixe, il faut viser à maintenir au minimum l'attente d'E / S externes.

Pourtant, lorsqu'un processus récepteur passe beaucoup de temps à attendre des E / S externes, il est juste en train de dormir jusqu'à ce que le noyau soit informé que de nouvelles données sont arrivées sur son descripteur de socket ou autre. Ce sommeil crée une ouverture pour que des processus supplémentaires effectuent un travail utile pendant cette période. Si vous avez beaucoup d'attente d'E / S externes, il est prudent d'augmenter le nombre de threads récepteurs à des valeurs telles que 32 ou 64. Si la plupart de ce que font vos processus de travail est d'attendre un servlet Java obèse morbide sur un autre serveur, vous pouvez permettre d’en avoir plus d’attendre.

C'est pourquoi un système Linux typique a des centaines de processus d'arrière-plan en cours d'exécution, même s'il n'y a que 2, 4 ou 8 threads matériels disponibles. La plupart du temps, ces processus ne  font rien. Ils attendent simplement des stimuli externes. S'ils fixaient tous le processeur, vous auriez un problème.

Combien de processus de réception peut-il y avoir? Toutes choses étant égales par ailleurs, la réponse est «pas trop». Ils ne sont pas conçus pour être exécutés par centaines ou par milliers. Chaque processus enfant est assez lourd, transportant, au minimum, une allocation de quelques mégaoctets de mémoire de paquet, et totalisant son propre descripteur de connexion à des services tels que des bases de données, des proxies RTP, etc. Puisque les processus enfants Kamailio doivent partager peu de choses, il y a des mutex de mémoire partagée sur ces structures de données. Je n'ai pas de chiffres, mais la conception rapide du mutex n'est clairement pas destinée à prendre en charge un très grand nombre de processus. Je suppose que c'est un témoignage de la boucle de traitement des appels relativement efficace de CSRP qui, bien que très liée à la base de données, nous avons trouvé dans nos propres tests des signes de rendements décroissants après une augmentationchildren bien au-delà du nombre de threads matériels disponibles.

D'un point de vue académique, le moyen le plus simple de savoir que vous avez besoin de plus de processus enfants est de surveiller la file d'attente de réception des paquets du noyau en utilisant netstat(ou ss, puisque netstatc'est obsolète dans RHEL> = 7, conformément aux développements généraux en systemdterre):

                      [racine @ allegro-1 ~] # ss -4 -n -l | grep 5060 
                      udp UNCONN 0 0 10.150.20.2:5060 *: * 
                      udp UNCONN 0 0 209.51.167.66:5060 *: *
La troisième colonne est la RecvQcolonne. Dans des conditions normales, sa valeur devrait être 0, peut-être éphémère, à quelques centaines ou milliers d'entrées ici et là. Si la taille de la file d'attente de réception est continuellement> 0, qu'elle éclate obstinément ou, pire que tout, qu'elle augmente de manière monotone, cela vous indique que les messages SIP entrants ne sont pas consommés assez rapidement par les processus récepteurs. Ces files d'attente de réception peuvent être  réglées  dans une certaine mesure, mais cela ne résoudra finalement pas votre problème. Vous avez juste besoin de plus de processus pour sucer la tétine en sachet.

Des résultats plus fins peuvent être obtenus avec des  tests de  scénario sipp . Exécutez des appels via votre proxy Kamailio et augmentez le taux d'établissement des appels jusqu'à ce que l'UAC commence à signaler les retransmissions. Cela donne un aperçu d'une dimension différente du problème que la file d'attente de paquets: votre proxy met-il trop de temps à répondre? Dans les deux cas, cependant, les options disponibles sont soit de réduire l'attente d'E / S pour libérer les processus récepteurs pour traiter plus de messages, soit d'ajouter plus de processus récepteurs.

Cependant, une fois que vous avez décidé d'ajouter des processus de réception, vous devez vous demander: ces processus font-ils beaucoup d'attente ou sont-ils toujours occupés? Si le traitement de votre demande / message dans le script de configuration a relativement peu de retard d'E / S de bout en bout, tout ce que vous allez faire est de surréserver votre CPU, augmentant votre moyenne de charge et ralentissant le système dans son ensemble. Dans ce cas, vous avez simplement atteint les limites de votre matériel ou de votre architecture logicielle. Il n'y a pas de solution simple pour cela.

C'est pourquoi, lorsque la question du nombre idéal de processus récepteurs est posée, les réponses données sont souvent évitantes et sans engagement.


## QU'EN EST-IL DU TRAITEMENT ASYNCHRONE?
Au cours des dernières années, Kamailio a évolué beaucoup de asynchrones traitement fonctions . Daniel-Constantin Mierla  a quelques  exemples et informations utiles  tirés de Kamailio World 2014.

L'idée de base du traitement asynchrone, en termes de Kamailio, est qu'en plus des processus principaux du récepteur, un  pool supplémentaire de processus est engendré auquel les opérations de blocage latentes peuvent être déléguées. Les transactions sont suspendues et mises en file d'attente vers ces processus externes, et ils y parviennent… dès qu'ils peuvent y accéder - c'est la partie «asynchrone». Cela permet aux principaux processus récepteurs SIP de traiter d'autres messages au lieu d'être bloqués par des opérations d'E / S coûteuses, car le gros du travail est laissé aux processus de travail des tâches asynchrones dédiés.

Le traitement asynchrone peut être très utile dans certaines situations. Si vous savez que le routage de vos demandes va coûter cher, vous pouvez renvoyer une 100 Tryingtâche immédiate et sans état et transférer les tâches de traitement vers les travailleurs des tâches asynchrones.

Cependant, une note de prudence. Est souvent tenu le traitement asynchrone de toutes sortes d'être une panacée, tirée par la mode populaire de la Silicon Valley et modèles de conception async-tout dans le monde de Node.js . Il y a beaucoup de réflexion et d'exubérance culte du fret autour du traitement asynchrone.

En tant que principe directeur, rappelez-vous que l'asynchronie n'est pas magique et qu'elle ne peut pas réaliser ce qui est autrement impossible du point de vue thermodynamique étant donné le nombre de transistors sur votre puce. Dans de nombreux cas, la programmation asynchrone est presque une sorte de sucre syntaxique, un point de vue sémantique différent sur les mêmes opérations qui doivent finalement être exécutées d'une manière ou d'une autre sur le même système avec les mêmes ressources. Le fait que la responsabilité du multiplexage d'E / S soit transférée à un acteur externe et opaque ne change rien à cela.

Le traitement asynchrone impose également ses propres frais généraux: dans le cas de Kamailio, il est difficile de suspendre une transaction TM  et de la réanimer dans un thread différent qui doit être pesé. (Je ne peux pas dire combien de complexité, et, comme pour tout le reste dans cet article, je n'ai fait aucun effort pour la mesurer ou la décrire avec la rigueur de la méthode scientifique. Mais c'est là.)

Dans le cas courant des charges de travail basées sur une base de données, le traitement asynchrone ne fait guère plus que pousser le point douloureux vers un autre endroit. Pour faire ressortir le problème, prenons un exemple de notre propre produit CSRP:

Dans CSRP, nous écrivons des événements CDR dans notre base de données PostgreSQL de manière asynchrone, car ces opérations sont assez coûteuses et peuvent potentiellement déclencher une cascade de déclencheurs de base de données pour l'évaluation des appels, allongeant la transaction. Nous ne nous soucions pas vraiment si les CDR sont écrits avec un léger retard; il est bien plus important que cette comptabilité ne bloque pas les processus du récepteur SIP.

Cependant, de nombreux clients CSRP choisissent d'exécuter leur base de données PostgreSQL sur le même hôte que le proxy Kamailio. Si la base de données est occupée à écrire des CDR et associe le contrôleur de stockage à des opérations d'écriture, cela rendra  tout moins réactif, asynchrone ou non, y compris les requêtes en lecture seule requises pour le traitement des appels. Même si la base de données est située sur un hôte différent, notre traitement des appels dépend fortement de la base de données, de sorte que la saturation de la base de données a des conséquences néfastes malgré tout.

Cela peut engendrer une mauvaise boucle de rétroaction positive:

L'ajout de travailleurs de tâches asynchrones n'aidera pas; ils vont simplement surcharger le stockage avec un Firehose supplémentaire d'événements CDR.
La file d'attente de tâches asynchrone s'empilera jusqu'à ce que les points de terminaison SIP appelants commencent CANCELles appels en raison d'un délai de post-numérotation élevé (PDD).
Ajouter plus de travailleurs de réception n'aidera pas; si le système dans son ensemble connaît une attente d'E / S élevée, ajouter plus de travailleurs pour accepter plus de messages SIP signifie simplement plus de requêtes et encore plus de charge.
Un modèle de conception à la mode ne peut pas résoudre ce problème; vous avez juste besoin de plus de matériel, ou d'une approche différente (en termes d'E / S, d'algorithmes, de demande de stockage, etc.) pour appeler le traitement.

Le point est le suivant: avant de déplacer la charge vers une autre partie du système afin de faire passer plus de trafic par la porte d'entrée, considérez l'impact globalement et globalement. Peut-être que vous pouvez demander à Kamailio d'absorber plus de paquets, mais cela ne signifie pas que vous devriez le faire. Dans quelle mesure vos contributions externes s'adaptent-elles à la tâche?

Les tâches asynchrones peuvent être très pratiques pour certains types d'applications, notamment lorsqu'une sorte d'activité doit être retardée dans le futur (par exemple, les notifications push). Nous aimons notre comptabilité CDR asynchrone, car elle est lourde, et pourtant il n'est pas nécessaire qu'elle soit en temps réel ou réactive selon les normes SIP. Cependant, pour maximiser le débit des appels dans une charge de travail liée aux E / S comme la nôtre, dans laquelle la demande de stockage et de base de données est plus ou moins une fonction linéaire des demandes par seconde, c'est beaucoup moins clair. Nos propres tests suggèrent que le traitement asynchrone donne au mieux des avantages marginaux, et que nous ferions peut-être mieux de rester honnête et de mettre nos efforts pour réduire davantage notre latence de traitement dans le contexte d'exécution normal et synchrone.

## CONCLUSION

Il n'y a pas de réponse simple et générique à la question de savoir comment tirer le maximum de débit de Kamailio et / ou combien de processus de travail receveurs à utiliser. Cela nécessite une prise en compte approfondie de la nature de la charge de travail et de l'environnement d'exécution, et, très probablement, des tests empiriques - doublement pour les applications sur mesure et / ou non standard.
Une directive raisonnable pour la plupart des charges de travail Kamailio génériques et / ou courantes consiste à définir les  enfants comme étant égaux au nombre de threads matériels disponibles. La prévalence des serveurs avec processeurs quad-core + HyperThreading explique probablement pourquoi la configuration de stock est livrée avec un paramètre de 8.
Les fonctionnalités asynchrones sont pratiques et peuvent, dans une certaine mesure, être utilisées pour augmenter le débit brut, mais rencontrent rapidement des rendements décroissants lorsque le résultat est une augmentation drastique de la charge d'E / S de base sur l'hôte local ou une dépendance à laquelle la charge de travail est lourde. Liaison E / S.





























