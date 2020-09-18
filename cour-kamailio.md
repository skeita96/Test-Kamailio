#   RECORD ROUTING


SIP a été conçu principalement comme un protocole poste à poste, avec des nœuds spéciaux dans le réseau (serveurs) censés aider pendant le processus de création de dialogue (comme la localisation des services et des autres pairs dans le réseau). Une fois le dialogue établi, la communication doit être transportée de bout en bout, y compris les paquets de signalisation SIP pour mettre à jour le dialogue ou pour le terminer.
Dans certains cas, la topologie de communication du réseau ou le modèle commercial exigent que les serveurs SIP restent dans la boucle du canal de signalisation SIP.
Un exemple est la communication entre pairs situés dans différents réseaux privés, derrière les routeurs NAT. Dans ce cas, le serveur SIP agit comme un relais des paquets SIP dans un dialogue, sans lequel la communication n'est pas possible car il n'y a pas de route IP directe entre les réseaux privés.
Un autre exemple est l'obligation financière (ou légale) de stocker des enregistrements de données d'appel (CDR), avec des détails sur le début (alias événement START) et la fin (alias événement STOP) d'un dialogue. Dans ce cas, le serveur SIP doit être maintenu dans le canal de signalisation SIP des dialogues établis pour recevoir les demandes BYE.

Image ...


Le mécanisme spécifié par le SIP pour que les nœuds intermédiaires restent dans le canal de signalisation est connu sous le nom de routage d'enregistrement. Cela implique l'ajout d'un en-tête spécial, appelé Record-Route, par chaque nœud intermédiaire du réseau qui veut rester dans le chemin de signalisation SIP à la demande qui crée le dialogue (le dialogue initial INVITE for VoIP).
Il existe deux types de mécanismes de routage des enregistrements :
- le routage strict - l'ancienne spécification concernant le routage des enregistrements, non recommandée de nos jours, conservée pour la rétrocompatibilité avec les anciens appareils SIP
- routage lâche - la nouvelle spécification, recommandée de nos jours, qui est celle utilisée par Kamailio pour le routage des enregistrements
Le point final UA répondant à la demande initiale d'un dialogue doit refléter tous les en-têtes Record-Route dans la réponse 200. Il construira le chemin de signalisation à utiliser dans la demande de dialogue, en commençant par les adresses trouvées dans l'en-tête Record-Route le plus haut, en ajoutant le tout au dernier en-tête Record-Route et en complétant la liste avec l'adresse de l'en-tête Contact.
L'UA du point final qui a envoyé la demande initiale du dialogue construira le chemin de signalisation pour les demandes de dialogue interne en utilisant la réponse 200 ok, en commençant par les adresses trouvées dans le dernier en-tête Record-Route, en ajoutant le tout à l'en-tête Record-Route le plus élevé et en complétant la liste avec l'adresse de l'en-tête Contact.
Le diagramme suivant montre comment le chemin de signalisation est construit par l'appelant et l'appelé, lorsque la demande INVITE initiale passe par deux proxies SIP intermédiaires et que les deux doivent être conservés dans le canal de signalisation.

Un proxy qui effectue un routage lâche doit ajouter le paramètre "lr" dans l'en-tête Record-Route. Si le paramètre "lr" est manquant, il est considéré comme un routage strict.
La différence entre le routage strict et le routage souple réside dans la façon dont le chemin de signalisation est construit dans les demandes de dialogue.
Le routage strict spécifie que l'adresse du prochain saut se trouve dans l'URI de la requête. Cela signifie que l'UA A utilise l'adresse de P1 comme URI de la requête, en ajoutant P2 et le contact de l'UA B comme en-têtes de route. P1 doit recevoir la requête avec sa propre adresse dans R-URI, puis prend l'adresse de l'en-tête de route le plus élevé et définit le R-URI avec elle. L'en-tête de Route le plus haut est supprimé une fois que son adresse est définie dans le R-URI. P1 transmet la demande à l'adresse R-URI.

Le routage lâche précise que l'adresse du dernier saut se trouve dans l'URI de la requête. Cela signifie que UA A utilise l'adresse de contact de UA B comme URI de la requête, en ajoutant P1 et P2 comme en-têtes de route. P1 reçoit la requête avec sa propre adresse dans l'en-tête de Route le plus élevé, supprime cet en-tête et transmet la requête à l'adresse dans les en-têtes de Route suivants.
En termes de traitement à chaque saut intermédiaire, le routage strict signifie la mise à jour de R-URI et la suppression de l'en-tête de Route le plus élevé, la transmission à la nouvelle adresse dans R-URI, tandis que le routage lâche signifie la suppression de l'en-tête de Route le plus élevé et la transmission à l'adresse dans l'en-tête de Route suivant ou à l'adresse dans R-URI s'il n'y a plus d'en-têtes de Route.
Un dialogue SIP peut passer par les deux types de sauts intermédiaires, les routeurs SIP stricts et les routeurs SIP libres. Kamailio peut détecter et traiter les deux cas de routage strict et lâche pour les demandes internes au dialogue, mais il n'ajoutera que des en-têtes de routage lâches dans les demandes initiales.
Le diagramme précédent montre l'utilisation du routage lâche dans les demandes de dialogue à travers deux proxies SIP intermédiaires.
N'oubliez pas que les réponses SIP sont acheminées au moyen des en-têtes Via, et que le routage des enregistrements n'est donc utilisé que pour les demandes SIP.
Il est extrêmement courant que le routage d'enregistrement soit utilisé dans les instances Kamailio agissant en tant que mandataires. Le traitement lié à ce mécanisme est mis en œuvre dans le module rr. Kamailio est capable d'ajouter deux en-têtes Record-Route, ceci est nécessaire dans des situations particulières où Kamailio doit ponter la couche transport pour les messages SIP (par exemple, l'INVITE initial est reçu sur IPv4 et doit être envoyé sur IPv6) de sorte que chaque saut voisin se voit présenter une adresse qu'il est routable de son propre point de vue. Traduit avec www.DeepL.com/Translator (version gratuite)


#  Kamailio Architecture


Kamailio est une application de type démon, fonctionnant en arrière-plan, sans interface utilisateur graphique (GUI) qui lui est liée. Il peut s'exécuter en avant-plan à des fins de test ou de dépannage, en restant attaché au terminal et en imprimant des messages de journal à l'intérieur de la console.
Il s'agit d'une application multi-processus (elle n'est pas multi-threading), selon le fichier de configuration, le nombre de processus est variable. Chaque processus a un rôle spécifique pour chaque instance de Kamailio :
- accompagnateur principal - processus initial, s'occupant de l'analyse du fichier de configuration, de la configuration de l'environnement de démarrage et de la création des processus et des temporisateurs des travailleurs SIP
- tcp attendant - le processus de gestion des travailleurs TCP et des connexions
- récepteurs sip tcp - les processus traitant le trafic reçu par TCP
- récepteurs sip udp - les processus qui gèrent le trafic sur l'UDP
- récepteurs sip sctp - les processus de traitement du trafic sur SCTP
- les récepteurs d'interface de contrôle 
- les processus traitant les commandes MI/RPC, ils peuvent être :
- récepteur FIFO
- Récepteur TCP/UDP/UNIXSOCK
- Récepteur XMLRPC

- les minuteries - les processus exécutant des tâches périodiques, certaines d'entre elles démarrées par le noyau et d'autres par divers modules, elles peuvent être :
- des minuteurs de base
- le minuteur principal - traitement des exigences de base du SIP telles que les retransmissions et
autres tâches périodiques enregistrées par les modules au démarrage
- temporisateur lent - destiné à l'exécution de tâches qui peuvent prendre beaucoup de temps - temporisateurs personnalisés
- nat pinging timer - envoi de paquets NAT keepalive
- rtimer module timers - exécution des blocs de parcours des fichiers de configuration sur timer - travailleurs spécifiques aux modules - les processus lancés par les différents modules pour effectuer des
les tâches, par exemple
- Passerelle SIP-XMPP
- traitement asynchrone
Vous pouvez lister les processus d'une instance de Kamailio, ainsi que leur rôle, en utilisant l'outil kamctl. En commençant par le fichier de configuration par défaut, sans activer de fonction supplémentaire, la sortie de la commande "kamailio ps" est :


Comme il s'agit d'une application multiprocessus, il est important de comprendre que le traitement des paquets SIP se fait en parallèle. En outre, les paquets SIP appartenant à la même transaction ou au même dialogue peuvent être traités par des processus différents. Vous ne pouvez donc pas utiliser de variables de mémoire privée pour stocker les données que vous souhaitez rendre persistantes dans une transaction ou un dialogue SIP.
Par exemple, le diagramme suivant montre que l'invitation et la réponse à celle-ci sont reçues par différents processus d'application.


Lors de la réception de messages SIP via UDP ou SCTP, le noyau sélectionne le processus d'application, pour les nouvelles connexions TCP/TLS, le processus TCP attendant de Kamailio sélectionnera le travailleur TCP le moins chargé.

Du point de vue de la structure du code source, l'application est composée de :
- noyau - code source commun requis par d'autres composants, nécessaire à l'application pour fonctionner, n'ayant aucune dépendance avec d'autres composants internes du code source
- bibliothèques internes - code source commun pour plusieurs modules, au cas par cas ayant une dépendance à l'égard des bibliothèques centrales ou externes
- modules - extensions dont l'utilisation est facultative, selon le noyau et au cas par cas, pour les bibliothèques internes ou externes


# KAMAILIO CORE ( NOYAU KAMAILO)



Le noyau tente d'inclure le code abstrait nécessaire partout ailleurs, non lié à une caractéristique métier spécifique, laissant ces implémentations aux modules. Avec cette approche à l'esprit, le noyau vise à rester aussi petit que possible et à éviter les conflits de mise en œuvre.
À l'heure actuelle, le noyau comprend :
- Analyseur SIP - le code permettant d'analyser le contenu des messages SIP
- les couches de transport - le code pour la réception et l'envoi par UDP, SCTP et TCP avec des crochets pour les cryptages TLS
- gestionnaire de mémoire - gestionnaire de mémoire interne pour la mémoire privée et partagée
- interpréteur de fichier de configuration - analyse du fichier de configuration et exécution au moment de l'exécution
- gestionnaire de verrouillage - gestion de la synchronisation pour l'accès aux ressources internes
- le cadre de variables - l'API pour les pseudo-variables, les transformations et les sélections
- l'interface des modules - l'API pour charger les modules et importer les paramètres et fonctions exportés
- cadre d'interface de contrôle - l'API pour mettre en œuvre les commandes de contrôle


 DNS resolver - le code permettant d'effectuer des requêtes DNS et de mettre en cache les résultats
 
 # SIP PARSER 
 
 Kamailio dispose de son propre analyseur SIP, ciblant les besoins d'un proxy SIP. Cela signifie la capacité à :
- traiter très rapidement - contrairement à un agent utilisateur côté client qui traite généralement peu de dialogues en même temps, un serveur SIP peut avoir des milliers de transactions et de dialogues actifs. Kamailio met en œuvre de nombreuses astuces pour optimiser l'analyse.
- Un serveur SIP peut être déployé sous de nombreuses formes, du proxy léger ou de l'équilibreur de charge au serveur d'application SIP complet exécutant des services de présence. L'analyseur ne prend en compte que les attributs nécessaires aux services en cours d'exécution, il n'analyse pas chaque petit élément et ne vérifie pas sa validité, si aucun module n'en a besoin.
- mise en cache des parties analysées - une fois qu'une partie du message SIP est analysée, sa structure décomposée est mise en cache, une deuxième exigence d'un autre composant pour analyser cette partie est d'obtenir la version mise en cache
- ne comprendre que les parties utilisées pour le routage ou les services fournis par le serveur SIP lui-même - même en analysant les détails, le proxy ne vérifie pas la validité du contenu pour les en-têtes spécifiques au point final
- pas de clonage - les attributs d'un message SIP ne sont généralement pas clonés dans des structures séparées. Kamailio conserve le tampon avec le message reçu et place des crochets à l'intérieur du tampon pour localiser les attributs
Ce type de traitement est appelé analyse incrémentielle. Si vous pensez à la structure d'un message SIP, il y a trois composantes principales : la première ligne, les en-têtes et le corps. La première ligne nécessite une analyse spéciale pour la demande ou la réponse, mais les en-têtes ont le format générique du nom, des deux points et du corps, suivis de la fin de ligne.


Il est très facile de sauter par-dessus les en-têtes qui ne présentent aucun intérêt pour un proxy SIP, en analysant le nom puis en sautant à la fin de l'en-tête, en recherchant la fin d'en-tête appropriée, laissant le corps de l'en-tête non préparé.
Le corps du message SIP est destiné aux points terminaux, un proxy SIP utilisé pour le routage n'interfère pas tant que ça avec celui-ci. Cependant, Kamailio propose un analyseur SDP (utilisé dans les appels VoIP) ainsi qu'un analyseur XML (utilisé pour les documents de présence).
Comme mentionné précédemment et illustré dans la figure suivante, Kamailio conserve le tampon avec le contenu du message SIP reçu, en pointant à l'intérieur de celui-ci lors du renvoi des valeurs des attributs spécifiques SIP.



Cette architecture de l'analyseur, avec des références au message SIP original, présente certains avantages, principalement en termes de vitesse de traitement, mais aussi certains inconvénients dont nous parlerons plus loin dans ce chapitre.
S'il est nécessaire d'accéder à des composants plus profonds, l'analyseur syntaxique continue à décomposer les attributs, tout en pointant à l'intérieur du tampon avec le message SIP.
La figure suivante montre un en-tête From décomposé.


Comme tous ces attributs SIP pointent à l'intérieur d'un tampon, il n'est pas nécessaire de cloner les valeurs, ce qui évite de nombreuses opérations malloc et de mémoire libre pendant l'analyse. Mais d'un autre côté, la mise à jour des valeurs ne peut pas être effectuée directement dans la mémoire tampon sans perturber ce qui a été analysé jusqu'à présent.
La solution pour cela a été de conserver toutes les opérations de suppression ou d'ajout de valeurs dans le message SIP sous forme de liste de modifications. Par exemple, l'ajout ou la suppression d'en-têtes relève de cette opération. On peut considérer cela comme une liste de correctifs, le contenu initial étant le même jusqu'à ce que les correctifs soient appliqués. Le diagramme suivant montre la vue interne de la suppression de l'en-tête Subject et de l'ajout d'un nouvel en-tête My-Subject.

Automatiquement, les modifications apportées au contenu du message SIP sont appliquées avant d'écrire le message sur le réseau. Vous pouvez les appliquer sur demande dans le fichier de configuration en utilisant la fonction msg_apply_changes() exportée par le module textopsx.
Tant que les modifications ne sont pas appliquées, les nouvelles valeurs ne sont pratiquement pas reflétées dans les attributs SIP. Par exemple, regardez le morceau suivant du script du fichier de configuration appliqué sur le message SIP précédent :


          message:
          remove_hf(“Subject”); # removing header Subject
          if(is_present_hf(“Subject”)) { # test if the header Subject is present in SIP message
          # execution will ALWAYS go here }


Supprimer l'en-tête Subject et vérifier immédiatement sa présence peut prêter à confusion car la vérification sera toujours vraie. L'en-tête n'a pas été effectivement supprimé du tampon avec le message SIP, de sorte que la vérification le trouve à cet endroit.
La bonne façon de procéder est la suivante :


        remove_hf(“Subject”); # removing header Subject
        msg_apply_changes();
        if(is_present_hf(“Subject”)) { # test if the header Subject is present in SIP message
        # execution will NEVER go here }
        
        
  Il n'est pas recommandé d'utiliser msg_apply_changes() de manière intensive, car il réinitialise les états de l'analyseur SIP et peut affecter les performances.  
#    GESTIONNAIRE DE LA MÉMOIRE  
  
  
  
Kamailio a son propre gestionnaire de mémoire, pratiquement il demande au système d'exploitation un gros morceau de mémoire et ensuite il fait en interne l'allocation de plus petits morceaux, selon les besoins des composants de l'application. La figure suivante montre une relation graphique entre la mémoire système et la gestion de la mémoire de Kamailio.
Conçu comme une application multi-processus, Kamailio ne nécessite aucune synchronisation pour accéder à la mémoire privée. Le gestionnaire de mémoire standard d'un système d'exploitation est conçu pour être générique, pour fonctionner de la même manière en multi-processus et multi-threading, en se verrouillant pour tout type d'opérations. C'est l'un des avantages du gestionnaire de mémoire interne, il évite le verrouillage pour accéder à la mémoire privée, ce qui améliore la vitesse de traitement.
D'autre part, la même architecture d'application multi-processus nécessite de travailler avec une mémoire partagée, pour accéder à des structures de données communes entre les processus, telles que les tables de routage, les enregistrements de localisation et les transactions SIP. Le gestionnaire de mémoire interne offre une couche abstraite aux différents systèmes de mémoire partagée, ce qui facilite l'écriture du code source pour les développeurs. Il ajoute également quelques optimisations pour les traitements spécifiques SIP.  

Par défaut, Kamailio utilise 32 Mo de mémoire partagée et 4 Mo de mémoire privée par processus. Vous pouvez contrôler la taille des pools de mémoire partagée et de mémoire privée au démarrage, via les paramètres de la ligne de commande :
-m - définir la taille de la mémoire partagée en Mo
-M - fixer la taille de la mémoire privée en Mo
Par exemple, en commençant par 512 Mo de mémoire partagée et 8 Mo de mémoire privée :
kamailio -m 512 -M 8 ...
Il existe plusieurs implémentations de gestionnaires de mémoire à Kamailio, deux d'entre elles étant les plus utilisées :
- f_malloc - opérations mémoire rapides - recommandé pour le mode production, généralement activé dans les versions stables
- q_malloc - opérations mémoire orientées vers le débogage - recommandé pour le développement et le dépannage
Kamailio offre également la possibilité d'utiliser le gestionnaire de mémoire du système d'exploitation pour gérer les opérations de mémoire privée.
Les variables du fichier de configuration, selon le type, ont les valeurs stockées soit en mémoire privée soit en mémoire partagée. La plupart d'entre elles, y compris les attributs SIP, sont en mémoire privée, comme :


        - $ru, $rU, $rd - les attributs de l'URI de la demande
        - $fu, $tu - l'URI de l'en-tête From/To et ses attributs - $hdr(name) - la valeur des en-têtes SIP
        - $var(name) - variables privées de script
        - $dbr(key) - résultat de l'interrogation de la base de données
        
        
  Parmi les variables du fichier de configuration, on trouve des variables utilisant la mémoire partagée pour stocker les valeurs : - $avp(key) - paires attributs-valeurs stockées par transaction SIP
- $xavp(key) - mise en œuvre étendue des AVP
- $shv(key) - variable partagée avec une valeur unique
- $sht(key) - clés partagées de la table de hachage
Si vous souhaitez stocker une valeur lors du traitement d'une demande SIP et l'utiliser lors du traitement de la
de la réponse, veillez à utiliser des variables de mémoire partagée.


# LOCKING MANGER



Il s'agit d'une API abstraite pour les verrous mutex et les barrières mémoire. Principalement utile pour les développeurs, le système de verrouillage est disponible pour une utilisation dans le fichier de configuration via plusieurs fonctions exportées par le module cfgutils.
Le besoin de verrouillage dans le fichier de configuration se fait sentir lors de la mise à jour de valeurs accessibles à partir de plusieurs processus en même temps, par exemple la mise à jour de variables partagées. Le suivi de la configuration n'est pas sûr en cas de charge élevée, car il implique une lecture puis une mise à jour :


              $shv(x) = $shv(x) + 10;
              It has to be done like:
              lock(“x”);
              $shv(x) = $shv(x) + 10; unlock(“x”);    
    
Pour mieux comprendre comment définir les verrous et les utiliser dans le fichier de configuration, voir le fichier readme du module *cfgutils* :       


# TRANSPORT LAYER

Le noyau met en œuvre le support pour IPv4 et IPv6, avec des couches de transport pour UDP, TCP, TLS et SCTP.
UDP est la couche de transport la plus utilisée pour les services VoIP, TCP et TLS étant devenus plus puissants récemment en raison de l'augmentation des services liés à la messagerie instantanée et à la présence.
Le SCTP est un protocole relativement nouveau, dont la conception convient mieux à l'architecture SIP, malheureusement peu adopté dans le monde, étant principalement utilisé dans les dorsales jusqu'à présent.
Kamailio peut faire le pont entre les couches de transport, ce qui signifie qu'il peut recevoir sur un protocole et envoyer sur un autre de façon transparente, comme recevoir une demande INVITE sur IPv4/TLS et l'envoyer sur IPv6/UDP.

La sélection de la couche de transport se fait sur la base des paramètres de l'URI de la requête SIP ou des adresses de route, et elle peut être appliquée par le rédacteur du script de configuration en utilisant des fonctions spécifiques du noyau ou du module tm.
Par exemple, l'envoi de TLS toujours :              
              
              t_relay_to_tls();
            # or set destination uri with transport tls 
            $du = “sip:1.2.3.4:5061;transport=tls”;
            t_relay();   
            
 
The TLS transport layer is implemented as a module, named tls, the core offering the hooks for encryption/decryption. This approach allow flexibility in running with or without TLS support, by just loading or not a module.





# ◊◊◊ VARIABLES FRAMEWORK


Le fichier de configuration offre deux options de variables
- pseudo-variables - historiquement développées via la branche du projet OpenSER-Kamailio - sélectionne - historiquement développées via la branche du projet SER
Remarque : les AVP (paires de valeurs d'attribut) étaient communes dans le passé à Kamailio et SER, mais pour la référence Kamailio, elles font partie des pseudo-variables, pour SER elles étaient séparées du concept de sélection.
Une pseudo-variable est identifiée par le symbole de départ "$". Une variable de sélection est identifiée par le symbole de départ "@". Vous pouvez utiliser les deux dans les expressions du fichier de configuration, mais certaines fonctions de module peuvent prendre des pseudo-variables comme paramètres.
Les pseudo-variables jouent un rôle important dans la construction de la logique de routage dans le fichier de configuration de Kamailio, c'est pourquoi elles sont abordées plus en détail dans un chapitre dédié plus loin dans ce livre. Dans le même chapitre est abordé un autre concept lié aux variables du fichier de configuration, respectivement les "transformations".
Le format d'une sélection de variables est le suivant :

        @key
       
 où la clé peut être composée à partir d'une chaîne complexe qui identifie la ressource à laquelle on accède, comme les noms d'en-tête, les attributs et les index. Par exemple, obtenir l'adresse dans le deuxième en-tête de Via :
              @via[1].host
Le cadre des pseudo-variables offre une classe spéciale pour accéder aux sélections : $sel(key), où key est l'équivalent dans le cadre des sélections, avec ou sans le symbole de début "@". Obtenir la même adresse à partir du deuxième en-tête Via est :
              $sel(@via[1].host)


Grâce à ce format, vous pouvez pratiquement donner n'importe quelle sélection comme paramètre aux fonctions qui nécessitent des pseudo-variables.
Les variables du fichier de configuration sont très utilisées dans les expressions (par exemple, les concaténations de chaînes de caractères, les opérations arithmétiques ou les conditions logiques) ainsi que dans les paramètres des fonctions utilisées dans les blocs de routage. Elles se trouvent également dans les paramètres des modules.
Chaque module peut exporter des pseudo-variables, des transformations ou des sélections, c'est pourquoi certaines d'entre elles ne sont disponibles que lorsque des modules spécifiques sont chargés. La plupart des pseudo-variables et des transformations sont implémentées dans les modules, tandis que de nombreuses sélections sont encore dans le cadre de base.

#   DNS RESOLVER


Kamailio prend en charge les types de requêtes DNS suivants : - A - pour obtenir l'adresse IPv4 d'un nom d'hôte
- AAAA - pour obtenir l'adresse IPv6 d'un nom d'hôte
- CNAME - pour résoudre les alias des noms d'hôtes
- SRV - emplacement du service (récupération du nom d'hôte et du port du serveur)
- NAPTR - découverte de service (récupération du transport, de l'adresse de service et du port) 
- TXT - récupération de données arbitraires du serveur DNS sur la base de l'adresse de service
En interne, Kamailio met en œuvre un système de mise en cache du DNS utilisé pour fournir : - un équilibrage de charge basé sur les résultats de la SRV du DNS
- liste noire des enregistrements DNS
Le cache interne peut être désactivé via un paramètre du fichier de configuration : dns_cache_init. Le livre de cuisine de Kamailio Core présente plus d'informations sur les paramètres liés au DNS qui permettent d'affiner le réglage du résolveur DNS.


# INTERFACE DE CONTRÔLE




Deux interfaces de contrôle sont disponibles dans Kamailio :
- Interface RPC - historiquement développée via la branche du projet SER
- Interface de gestion (MI) - historiquement développée via la branche du projet OpenSER-Kamailio
Les deux ont le même objectif : permettre l'interaction entre les humains ou les applications de tiers. Les cas d'utilisation courants des interfaces de contrôle sont l'envoi de commandes administratives pour :
- le téléchargement de contenu en mémoire
- le rechargement des données à partir du backend
- modifier le comportement en cours d'exécution sans redémarrage - envoyer des messages SIP
L'interface RPC essaie de suivre de près le concept d'appel de procédure à distance, en utilisant un interpréteur scanner-imprimante pour les commandes. La commande est lue au fur et à mesure de son exécution et le résultat est imprimé comme étant à venir.
Le MI travaille en interne avec des structures arborescentes, la commande est entièrement analysée et stockée dans une structure mémoire arborescente, l'exécution construisant un autre arbre avec la réponse.
Les deux interfaces de contrôle ont été conçues pour pouvoir gérer différentes couches de transport pour les commandes, telles que
- fichiers FIFO sur le système de fichiers local - fichiers socket unix
- prises UDP/TCP simples
- XMLRPC
Le noyau offre donc la couche abstraite qui rend l'implémentation des commandes de contrôle indépendante de la couche de transport.
L'interface de contrôle RPC est censée devenir la principale, à ce moment il est possible d'exécuter toutes les commandes MI encapsulées dans une commande RPC. Le module mi_rpc combiné avec le module ctl peut offrir l'inverse.
L'interface MI propose trois modules de couche transport : - mi_fifo - fichier FIFO
- mi_datagram - sockets unix et UDP
- mi_xmlrpc - XMLRPC via HTTP en utilisant une bibliothèque externe L'interface RPC offre deux modules de couche transport :
- ctl - fichier FIFO, sockets unix, sockets UDP et sockets TCP
- xmlrpc - XMLRPC via HTTP en utilisant la couche de transport centrale et l'analyseur
Le fichier de configuration par défaut livré avec Kamailio 4.2.x charge les modules mi_fifo et ctl, permettant d'envoyer des commandes de contrôle via les outils kamctl et sercmd. Il offre également une option permettant de charger le module xmlrpc.
Par exemple, lorsque vous exécutez Kamailio 4.2.x avec le fichier de configuration par défaut, vous pouvez exécuter la commande suivante dans un terminal pour voir les détails sur le temps de fonctionnement de l'application :

La liste de toutes les commandes MI disponibles peut être consultée avec : kamctl fifo which". L'index de ces commandes est disponible en ligne à l'adresse suivante

• http://www.kamailio.org/wiki/alphaindexes/4.2.x/micommands The index with RPC commands is available online at:
• http://www.kamailio.org/docs/docbooks/4.2.x/rpc_list/rpc_list.html




#  MODULES INTERFACE

Le noyau n'offre pas grand-chose en termes de fonctionnalités de logique métier (par exemple, équilibrage des charges, routage au moindre coût) ou de traitement SIP bien défini (par exemple, max forward, routage des enregistrements), ces parties étant intentionnellement laissées à l'abandon dans des extensions, appelées modules.
Dans le noyau est implémenté le système qui est capable de charger des modules et d'importer des symboles exportés tels que les paramètres et les fonctions des modules.
La même fonctionnalité peut être implémentée de plusieurs façons, une question de développeurs, donc l'inclusion de telles parties dans le noyau créera beaucoup de surcharge et de conflits. D'autre part, un module n'est chargé qu'à la demande, étant la décision du rédacteur du fichier de configuration de savoir lequel utiliser. Par exemple, le routage à moindre coût peut être réalisé en utilisant n'importe lequel des modules lcr, carrierroute, drouting ou des combinaisons de mtree, pdt, dialplan et dispatcher.
Il existe deux interfaces de modules, l'une spécifique aux anciens modules de Kamailio et l'autre spécifique aux anciens modules de SER, les deux pouvant fonctionner en même temps, de manière transparente du point de vue de l'administrateur, chaque module annonçant en interne quelle interface est mise en œuvre.
Dans une interface de module sont exportées plusieurs constantes, fonctions de rappel et structures de données qui ont un impact sur l'interaction à partir du fichier de configuration, au démarrage ou à l'exécution, comme :
- nom du module
- rappel de chargement de module
- rappel d'initialisation de module - rappel d'initialisation de processus - rappel de déchargement de module
- Rappel du traitement des réponses SIP
- liste des paramètres des modules
- liste des fonctions du fichier de configuration exportées - liste des variables du fichier de configuration exportées - liste des commandes de contrôle exportées
- liste des statistiques exportées
Au total, il y a plus de 150 modules, chacun d'entre eux étant accompagné d'un fichier README qui documente les éléments exportés pour être utilisés dans le fichier de configuration.
La documentation des modules Kamailio est disponible en ligne à l'adresse suivante
- http://kamailio.org/docs/modules/4.2.x/

Sans le chargement d'un module, le noyau lui-même est tout à fait inutile du point de vue du routage SIP, étant donné qu'il est capable d'effectuer le transfert des requêtes en mode apatride, sans même la possibilité d'envoyer une réponse SIP.
Dans les modules, vous trouverez la plupart des fonctionnalités, telles que l'authentification des utilisateurs, les services de localisation, la comptabilité, les connecteurs de base de données, le support RADIUS, le connecteur LDAP, les services de présence, la conférence par messagerie instantanée et le stockage hors ligne, la gestion des transactions, la gestion des dialogues, etc :
- http://www.kamailio.org/w/features/
Plusieurs modules seront abordés plus en détail dans différents chapitres de ce livre, lors de la présentation
comment déployer des fonctionnalités spécifiques.


#  INTERNAL LIBRARIES
Le support de la bibliothèque interne a été ajouté à partir de la version 3.0.0, permettant aux développeurs de mieux structurer le code partagé entre plusieurs modules, qui ne convient pas à l'ajout au noyau, étant spécifique à un ensemble de besoins particuliers.
À l'heure actuelle, il existe plusieurs bibliothèques internes, parmi lesquelles
- srdb1 - la première version de l'API générique pour la connectivité des bases de données (utilisée principalement par les modules spécifiques de Kamailio)
- srdb2 - la deuxième version de l'API générique pour la connectivité des bases de données (utilisée principalement par les modules spécifiques du SER)
- kmi - le code partagé de l'interface de gestion (IM)
- kcore - code extrait du noyau de Kamailio lors de la fusion avec SER - de Kamailio 1.5.x qui n'était pas commun pour tous les modules à conserver dans le nouveau noyau, y compris le cadre statistique
- srutils - divers utilitaires, tels que la génération d'ID uniques, l'analyseur JSON

- binrpc - code partagé pour la mise en œuvre du protocole RPC binaire personnalisé, utilisé par le module ctl et l'outil sercmd
- cds - cadre de sérialisation des structures génériques
- trie - trie des fonctions utilitaires de structure de données, utilisées à partir de modules tels que carrier route ou
userblacklist
L'utilisation de la bibliothèque interne au moment de l'exécution est transparente, ils sont installés puis chargés automatiquement à la demande par des modules. Il n'y a pas d'interaction avec les administrateurs, mais cela permet une meilleure structure du code, en gardant le noyau plus petit et plus robuste.



# MODULES


Les modules représentent des extensions de fonctionnalités du noyau, exportant vers le fichier de configuration de nouveaux paramètres et fonctions pour les blocs de routage.
Ils hébergent la majorité des fonctionnalités qui peuvent être offertes par Kamailio à l'heure actuelle, telles que - l'authentification et l'autorisation des utilisateurs
- services d'enregistrement et de localisation
- la comptabilité et le traitement des dialogues
- routage des enregistrements et traitement des retransmissions maximales
- la gestion des transactions et la génération de réponses SIP
- le routage au moindre coût et l'équilibrage des charges
- présence et services de messagerie instantanée
- des interprètes intégrés (Lua, C#, Perl, Python)
- couches de transport pour l'interface de contrôle (fifo, sockets en texte clair ou xmlrpc) - implémentation de TLS et de Websockets
- ENUM
- connecteurs de base de données (mysql, postgres, unixodbc, sqlite, ...)
- Support RADIUS et LDAP
- Serveur XCAP et relais MSRP
Chaque module doit être explicitement chargé dans le fichier de configuration, il n'y a pas de fonction de chargement automatique des modules, même pas lors du chargement d'un module qui nécessite d'autres modules.
Outre les paramètres et les fonctions du fichier de configuration, un module peut également exporter des variables, des commandes de contrôle ou des statistiques.
La documentation de chaque module est présente dans un fichier README à l'intérieur du répertoire contenant les sources du module. Sur le site kamailio.org, vous pouvez trouver une page qui indexe tous les LISEZMOI pour la navigation en ligne :

http://kamailio.org/docs/modules/4.2.x/


Plusieurs modules seront abordés plus loin dans ce livre, lors de la présentation de cas d'utilisation du Kamailio.





