MODULE USRLOC
Ce module assure la gestion des enregistrements des services de localisation, tels que :
- la mise en cache ou le stockage dans le back-end de la base de données
- l'exportation d'API génériques pour les utiliser dans d'autres modules, comme le registre
- l'exécution de rappels sur des événements pour utilisation dans d'autres modules comme pua_usrloc ou pua_reginfo - l'exportation de commandes de contrôle MI/RPC pour accéder aux enregistrements de localisation
La documentation du module est disponible à l'adresse suivante :
- http://kamailio.org/docs/modules/4.2.x/modules/usrloc.html
Il existe deux modes qui peuvent contrôler le type de stockage des documents de localisation, spécifiés par
le paramètre de module db_mode :
- 0 - stocker les enregistrements de localisation uniquement en mémoire, le mode par défaut
- 1 - stocker les enregistrements de localisation en mémoire et les écrire sur un serveur de base de données dès qu'un changement se produit
- 2 - stocker les enregistrements de localisation en mémoire et les écrire sur un serveur de base de données périodiquement, selon un calendrier
- 3 - stocker les enregistrements de localisation uniquement dans un serveur de base de données
Lorsque les enregistrements de localisation sont stockés en mémoire, ils ne sont utilisés qu'à partir de là, la copie de la base de données étant conservée pour des raisons de sauvegarde, pour les recharger lors du redémarrage. Si les enregistrements sont uniquement conservés en mémoire, un redémarrage du serveur SIP entraîne la perte de toutes les adresses de contact dans le tableau de localisation. Le stockage sur un serveur de base de données uniquement, désactive le rappel de l'API pour les contacts qui ont expiré automatiquement.
Le fait d'avoir une copie des enregistrements de localisation dans un système de base de données est communément appelé service de localisation avec stockage persistant.
Le module usrloc peut fonctionner avec plusieurs tables de localisation en même temps, le rédacteur du fichier de configuration doit les contrôler via le premier paramètre des fonctions save(...) et lookup(...) de le module "bureau d'enregistrement". Le nom de table standard utilisé actuellement est "location", db_mode=0 étant juste une référence à une structure en mémoire.
Si le module est configuré pour écrire sur un serveur de base de données, une table nommée "location" doit également être créée à cet endroit. La table de base de données "location" est créée par l'outil kamdbctl, si vous utilisez des noms différents, vous devez créer de nouvelles tables avec la même structure comme "location". Vous devez également ajouter un enregistrement à la table "version" comme celui qui existe pour "location".
La structure de la table de base de données "location" est définie par le script SQL suivant :

                  CREATE TABLE location (
                  id INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL, ruid VARCHAR(64) DEFAULT '' NOT NULL,
                  username VARCHAR(64) DEFAULT '' NOT NULL,
                  domain VARCHAR(64) DEFAULT NULL,
                  contact VARCHAR(255) DEFAULT '' NOT NULL,
                  received VARCHAR(128) DEFAULT NULL,
                  path VARCHAR(128) DEFAULT NULL,
                  expires DATETIME DEFAULT '2020-05-28 21:32:15' NOT NULL,
                  q FLOAT(10,2) DEFAULT 1.0 NOT NULL,
                  callid VARCHAR(255) DEFAULT 'Default-Call-ID' NOT NULL,
                  cseq INT(11) DEFAULT 1 NOT NULL,
                  last_modified DATETIME DEFAULT '1900-01-01 00:00:01' NOT NULL, flags INT(11) DEFAULT 0 NOT NULL,
                  cflags INT(11) DEFAULT 0 NOT NULL,
                  user_agent VARCHAR(255) DEFAULT '' NOT NULL,
                  socket VARCHAR(64) DEFAULT NULL,
                  methods INT(11) DEFAULT NULL,
                  instance VARCHAR(255) DEFAULT NULL,
                  reg_id INT(11) DEFAULT 0 NOT NULL
                  ) ENGINE=MyISAM;
The meaning of the columns is described in the next table:

<img src="location.png" alt="table location">
<img src="location2.png" alt="table location">

Il n'est pas recommandé de modifier les valeurs dans les enregistrements de la base de données, laissez-les au module usrloc. La seule opération sûre consiste à supprimer les enregistrements lorsque Kamailio n'est pas en cours d'exécution. Si vous supprimez des enregistrements lorsque Kamailio est en cours d'exécution, il n'y aura pas de mise à jour à condition qu'un rafraîchissement de l'enregistrement soit effectué pour cet enregistrement.
Une chose importante à savoir est que la colonne cflags stocke la valeur des drapeaux de branche définis dans le fichier de configuration. La valeur y est enregistrée par la fonction save(...) et restaurée dans le fichier de configuration par la fonction lookup(...).
Peu de réglages peuvent être effectués via des paramètres pour augmenter les performances de ce module :
- hash_size - si vous augmentez la valeur, alors la recherche des enregistrements de localisation est plus rapide. Mais si vous avez un petit nombre d'enregistrements, une valeur élevée pour ce paramètre entraîne une utilisation inutile de la mémoire partagée et des verrous mutex
- timer_procs - définissez ce paramètre lorsque vous souhaitez des processus de temporisation dédiés pour usrloc, également utile pour augmenter les performances lorsque vous traitez de nombreux enregistrements de localisation. Si ce paramètre n'est pas défini, alors le processus de base du timer est utilisé pour les tâches usrloc (telles que la vérification des enregistrements expirés ou l'écriture dans la base de données en db_mode=2)
Une autre chose qui peut également être personnalisée par le biais du paramètre du module, à savoir matching_mode, est la manière dont les enregistrements de contact sont mis en correspondance, ce qui permet de
- la correspondance des adresses de contact - basée sur les critères de la RFC3261, elle peut entraîner des conflits si le même utilisateur possède plusieurs téléphones dans différents réseaux privés utilisant la même adresse IP
- la correspondance des adresses de contact et des numéros d'appel - permettant de détecter les différentes séquences de demandes de REGISTRE SIP, même si elles proviennent de téléphones de réseaux privés ayant les mêmes adresses IP
- correspondance entre l'adresse de contact et le vecteur de chemin - permettant de différencier les demandes REGISTER avec la même adresse de contact provenant de chemins différents
Notez que si GRUU est activé et pris en charge par le dispositif SIP, la correspondance se fait sur la valeur +sip.instance. Si l'extension Outbound est prise en charge par le périphérique SIP, le paramètre reg-id est pris en compte pour la correspondance.

### RÉPERTORIER LES REGISTRES DE LOCALISATION 

Le vidage du contenu de la table de localisation peut être effectué avec l'outil kamctl. Siremis dispose également d'une vue web qui montre le contenu de la table de base de données "location" et le contenu de la mémoire peut être vidé avec des commandes MI ou RPC.

### UTILISATION DE KAMCTL

Kamctl a la commande "ul" pour la gestion des enregistrements de localisation, ses sous-commandes sont énumérées dans le bloc suivant :

### command 'ul|alias' - manage user location or aliases
- **ul show [<username>]**................ show in-RAM online users
- **ul show --brief**..................... show in-RAM online users in short format ul rm <username> [<contact URI>].... delete user's usrloc entries
- **ul add <username> <uri>** ............ introduce a permanent usrloc entry
- **ul add <username> <uri> <expires>** .. introduce a temporary usrloc entry

Pour lister tous les enregistrements des tables de mémoire, il suffit d'utiliser :
**kamctl ul show
Il imprimera tous les détails associés aux enregistrements de localisation. Ensuite, un exemple de sortie, lorsque seul l'utilisateur "alice" est enregistré :

Pour lister les contacts uniquement pour un usage spécifique de l'abonné :

**kamctl ul show username**

Si le déploiement est configuré en mode multi-domaine, vous devez fournir l'adresse complète de l'abonné enregistré :

**kamctl ul show username@domain**

L'exemple suivant montre le résultat pour l'utilisateur "alice" :

**kamctl ul show alice**

Le module usrloc exporte également des commandes pour ajouter ou supprimer des contacts via des commandes MI/RPC, enveloppées par kamctl dans les sous-commandes "ul add" et "ul rm".
Pour lister le contenu de la table de la base de données (lorsque db_mode est différent de 0 (zéro)), vous pouvez utiliser la commande db de kamctl :

**kamctl db show location**

Notez que si db_mode=2, alors les enregistrements de la mémoire sont synchronisés avec la base de données périodiquement, il peut donc y avoir des différences dans ce que le vidage de la mémoire montre et ce que la table de la base de données contient.

## UTILISATION DANS LE FICHIER DE CONFIGURATION PAR DÉFAUT

Sans toucher au fichier de configuration par défaut, le service de localisation est configuré pour stocker les enregistrements uniquement en mémoire.
Pour permettre le stockage permanent dans la base de données MySQL, deux définitions doivent être ajoutées :

      #!define WITH_MYSQL
      #!define WITH_USRLOC
      
Outre le chargement des modules registrar et usrloc et le paramétrage de ceux-ci, les parties du fichier de configuration par défaut qui leur sont liées se trouvent dans les blocs route [REGISTRAR] et route [LOCATION]. Toutes ces parties sont présentées dans l'exemple suivant :



              229. loadmodule "usrloc.so"
              230. loadmodule "registrar.so"
              .....
              310. # ----- registrar params -----
              311. modparam("registrar", "method_filtering", 1)
              312. /* uncomment the next line to disable parallel forking via location */
              313. # modparam("registrar", "append_branches", 0)
              314. /* uncomment the next line not to allow more than 10 contacts per AOR */
              315. #modparam("registrar", "max_contacts", 10)
              316. # max value for expires of registrations
              317. modparam("registrar", "max_expires", 3600)
              318. # set it to 1 to enable GRUU
              319. modparam("registrar", "gruu_enabled", 0)
              .....
              349. # ----- usrloc params -----
              350. /* enable DB persistency for location entries */
              351. #!ifdef WITH_USRLOCDB
              352. modparam("usrloc", "db_url", DBURL)
              353. modparam("usrloc", "db_mode", 2)
              354. modparam("usrloc", "use_domain", MULTIDOMAIN)
              355. #!endif
              .....
              417. # params needed for NAT traversal in other modules
              418. modparam("nathelper|registrar", "received_avp", "$avp(RECEIVED)")
              419. modparam("usrloc", "nat_bflag", FLB_NATB)
              .....
              507. # handle registrations
              508. route(REGISTRAR);
              .....
              519. # user location service
              520. route(LOCATION);
              .....
              629. # Handle SIP registrations
              route[REGISTRAR] {
              if (!is_method("REGISTER")) return;
              if(isflagset(FLT_NATS)) { setbflag(FLB_NATB);
              #!ifdef WITH_NATSIPPING
              # do SIP NAT pinging setbflag(FLB_NATSIPPING);
              #!endif }
              if (!save("location")) sl_reply_error();
              exit; }
              # User location service route[LOCATION] {
              #!ifdef WITH_SPEEDDIAL
              # search for short dialing - 2-digit extension if($rU=~"^[0-9][0-9]$")
              if(sd_lookup("speed_dial")) route(SIPOUT);
              #!endif
              #!ifdef WITH_ALIASDB
              # search in DB-based aliases if(alias_db_lookup("dbaliases"))
              route(SIPOUT); #!endif
              $avp(oexten) = $rU;
              if
              (!lookup("location")) { $var(rc) = $rc; route(TOVOICEMAIL); t_newtran();
              switch ($var(rc)) { case -1:
              case -3:
              send_reply("404", "Not Found"); exit;
              case -2:
              send_reply("405", "Method Not Allowed"); exit;
              } }
              # if
              when routing via usrloc, log the missed calls also (is_method("INVITE")) {
              setflag(FLT_ACCMISSED); }
              route(RELAY);
              exit;
               }



Les paramètres définis ou mentionnés pour le module #registrar sont (lignes 302-310 et 409) :
- method_filtering - pour n'utiliser que les contacts qui annoncent le support pour une demande SIP en cours ou aucune liste de demandes supportées. Par exemple, lorsqu'un appareil annonce la prise en charge des fonctions INVITE, ACK, CANCEL et BYE dans l'en-tête du contact, si un MESSAGE est envoyé à l'abonné à l'aide de l'appareil, la demande sera traitée par le serveur SIP
- append_branches - présenté dans le fichier de configuration sous forme de commentaire, pour permettre à l'administrateur d'activer/désactiver le #parallel #forking# à plusieurs contacts
- max_contacts - présenté dans le fichier de configuration sous forme de commentaire, pour permettre à l'administrateur de fixer une limite globale pour le nombre de contacts par abonné
- gruu_enabled - pour activer ou désactiver le support des extensions GRUU pour le bureau d'enregistrement et le service de localisation
- received_avp - défini uniquement si la traversée NAT est activée, utilisé pour la communication inter-modules avec nathelper
Les paramètres définis pour le module usrloc ne concernent que le mode de stockage persistant (lignes 343-345 et 410) :
- db_url - défini sur le jeton DBURL, qui représente l'URL pour se connecter au serveur de base de données MySQL
- db_mode - réglé sur 2, ce qui signifie que usrloc écrira les enregistrements dans la base de données périodiquement, sur la base d'une minuterie
- use_domain - défini sur le jeton MULTIDOMAIN, qui contrôle si la partie domaine de l'URI doit être utilisée pour construire l'AoR interne pour les enregistrements de localisation de l'abonné
- nat_bflag - n'est défini que si la traversée NAT est activée, en précisant quel est le drapeau brach utilisé pour marquer les contacts natted
La route [REGISTRAR] traite les demandes de REGISTRE, étant appelée depuis le bloc request_route, après que l'abonné ait été éventuellement authentifié avec son nom d'utilisateur et son mot de passe, afin que son identité puisse être affirmée.
Avant d'appeler la fonction save(...) pour mettre à jour les enregistrements de localisation en fonction de l'en-tête Contact et Expires du REGISTER, il existe un bloc IF qui teste si la requête vient derrière NAT et définit les drapeaux de branche qui doivent être sauvegardés dans la table de localisation.
La fonction save(...) envoie la réponse SIP en interne, car elle doit ajouter un en-tête Contact contenant les adresses de tous les enregistrements d'emplacement valides. Elle renvoie false uniquement lorsqu'une erreur interne s'est produite, par exemple lorsqu'une réponse est envoyée depuis le fichier de configuration avec sl_reply_error().
Le bloc de routage route [LOCATION] est exécuté dans le request_route à peu près à la fin, avant le relais. Les demandes pour les services locaux (bureau d'enregistrement ou présence) sont traitées avant, le trafic pour les réseaux SIP étrangers ou les passerelles RTPC est déjà acheminé. La dernière option pour la cible est un abonné local. Avant d'exécuter ce bloc de routage, il y a une vérification qui assure que l'URI de la requête contient un nom d'utilisateur :


            if ($rU==$null) {
            #request with no Username in RURI 
            sl_send_reply("484","Address Incomplete"); 
            exit;
            }













