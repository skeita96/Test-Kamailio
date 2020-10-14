## COMPOSANTES SUPPLÉMENTAIRES
La procédure d'installation présentée jusqu'à présent déploie le noyau de Siremis et fournit des vues préconfigurées pour accéder aux tables de la base de données utilisée par Kamailio.
Mais certains des composants nécessitent une configuration supplémentaire pour fonctionner correctement. Les sections suivantes présentent les détails de la mise en place de ces composants.
SERVICES DE COMPTABILITÉ
Ce composant nécessite que vous ayez coché l'option "Update SIP DB" dans la deuxième étape de l'assistant d'installation. Il nécessite également d'activer la comptabilité à la base de données dans le fichier de configuration de Kamailio.
Il y aura un chapitre dédié qui présente le mécanisme de comptabilité dans Kamailio, où nous détaillons également la partie correspondante dans Siremis, en la sautant ici pour éviter les doublons.

##PANNEAU DE COMMANDES MI
Ce composant donne une vue web qui peut envoyer des commandes MI via UDP à Kamailio et affiche la réponse. La configuration par défaut de Kamailio ne charge que le module mi_fifo, qui est destiné aux commandes MI envoyées via un fichier FIFO.
Pour pouvoir utiliser cette vue dans Siremis, vous devez charger le module mi_datagram dans le fichier de configuration de Kamailio :
loadmodule "mi_datagram.so" (charger le module "mi_datagram.so")
Le module est compilé et installé par défaut. Il faut ensuite spécifier l'IP et le port pour l'écoute des commandes MI, Siremis attend 127.0.0.1 et le port 8033 :
modparam("mi_datagram", "socket_name", "udp:127.0.0.1:8033")
Vous pouvez changer l'IP et le port comme vous le souhaitez, même pour les interfaces publiques, mais assurez-vous de protéger l'accès par un pare-feu, pour permettre la communication uniquement entre les hôtes Kamailio et Siremis. Permettre à tout le monde d'envoyer des commandes MI est dangereux, car cela peut permettre de récupérer des informations de Kamailio sans aucune authentification, et peut également déclencher l'arrêt de Kamailio.
Lorsque vous modifiez l'adresse IP et le port du paramètre de module "soket_name", vous devez également mettre à jour le fichier de configuration XML correspondant dans Siremis, situé à l'adresse suivante

            siremis/modules/ser/service/siremisMICommands.xml
            The content of this file for Siremis v4.0.0 is:
            <PluginService Name="siremisMICommands" Package="asipto" Class="siremisMICommands"> <MIConfig name="MIConfig" type="udp" mode="rich">
            <Local name="local" address="127.0.0.1" port="8044" timeout="3.0"/> <Remote name="remote" address="127.0.0.1" port="8033"/> <MICommands>
            <cmd name="ps" title="List Processes" command="ps"/>
            <cmd name="uptime" title="Show Uptime" command="uptime"/>
            <cmd name="getstatsall" title="Get All Statistics" command="get_statistics all"/>
            <cmd name="which" title="Get All MI Commands" command="which"/>
            <cmd name="dslist" title="List Dispatcher Records" command="ds_list"/>
            <cmd name="dsreload" title="Reload Dispatcher Records" command="ds_reload"/>
            <cmd name="pdtlist" title="List PDT Records" command="pdt_list"/>
            <cmd name="pdtreload" title="Reload PDT Records" command="pdt_reload"/>
            <cmd name="uldump" title="List Location Records" command="ul_dump"/>
            <cmd name="uldumpbrief" title="Brief of Location Records" command="ul_dump brief"/> <cmd name="addrlist" title="List Address Permissions Records"
            command="address_dump"/>
            <cmd name="subnlist" title="List Subnet Permissions Records" command="subnet_dump"/
            >
            <cmd name="addrreload" title="Reload Address Permissions Records" command="ad-
            dress_reload"/> </MICommands>
            </MIConfig> </PluginService>
            
            
            
 Les sockets de communication sont spécifiés par les éléments XML :
- Local - où vous pouvez spécifier l'adresse IP locale à laquelle Siremis doit se connecter, le port et le délai d'attente en secondes de la réponse à la commande MI
- Remote - vous pouvez spécifier l'IP et le port distant où Kamailio écoute les commandes MI, il doit correspondre à la valeur du paramètre "socket_name" du module mi_datagram dans le fichier de configuration de Kamailio
L'élément MICommands peut contenir une liste de commandes MI qui apparaîtra dans une sélection déroulante dans la vue des commandes MI de Siremis, ce qui facilite leur exécution en quelques clics au lieu de taper la commande.
La vue Web de Siremis pour cet élément est disponible dans le menu à SIP Admin => Commands Services => MI Commands. La capture d'écran suivante la présente.
Elle offre un champ de saisie dans lequel les commandes MI peuvent être tapées et ensuite exécutées en cliquant sur le bouton "Run".

## PANNEAU DE COMMANDES XMLRPC

L'autre option offerte par Siremis pour envoyer des commandes de contrôle à Kamailio est via XMLRPC. Il s'agit de commandes de type RPC pour le contrôle de Kamailio, et non de MI comme dans la section précédente. La vue de cette option est accessible sur SIP Admin => Commands Services => MI Commands. La capture d'écran suivante l'affiche.



## SERVICES DE CARTOGRAPHIE
Siremis est capable de créer et d'afficher des graphiques en utilisant la bibliothèque Open Flash Chart (sous licence GPL) - la bibliothèque est incluse dans le tarball de distribution de Siremis, vous n'avez rien d'autre à faire. Votre navigateur web doit être équipé d'un plug-in Flash Player.
Les données pour créer les graphiques sont tirées des tables résidant dans la base de données Kamailio. Il n'existe pas de tels tableaux par défaut - l'assistant d'installation de Siremis crée un tableau nommé "statistiques" avec des mesures prédéfinies, vous pouvez l'étendre si vous le souhaitez ou en créer un autre suivant le même type de structure.
Le tableau doit comporter une colonne qui stocke l'horodatage. Les valeurs temporelles sont utilisées pour l'axe des X dans les graphiques. Les autres colonnes doivent stocker des valeurs entières représentant la dépendance temporelle d'un attribut particulier.
Outre les graphiques dynamiques, le service des graphiques comprend des vues pour les graphiques ou les résumés générés à partir d'autres tables Kamailio, telles que la localisation ou l'acc. Pour ces derniers, il n'est pas nécessaire de faire quoi que ce soit, il suffit de charger les modules appropriés (usrloc ou acc) dans Kamailio et de les configurer avec le support de stockage de base de données.


CONFIGURATION KAMAILIO
rtimer pour exécuter périodiquement un blocage d'itinéraire à partir du fichier de configuration de Kamailio, où il insère les valeurs statistiques dans la base de données.
Les étapes suivantes sont présentées pour faire fonctionner les cartes livrées par défaut avec Siremis. Certaines des statistiques sont tirées directement des statistiques internes de Kamailio, d'autres sont construites par des opérations de configuration, en utilisant htable pour stocker les états en mémoire.

Les mesures stockées dans la table de la base de données sont :
- time_stamp - horodatage au moment de l'insertion
- shm_used_size - taille utilisée de la mémoire partagée
- shm_real_used_size - taille utilisée et surcharge de la mémoire partagée
- shm_max_used_size - taille maximale utilisée de la mémoire partagée
- shm_free_used_size - taille libre de la mémoire partagée
- ul_users - nombre d'utilisateurs actifs dans le service de localisation
- ul_contacts - numéro de l'adresse de contact dans le service de localisation
- tm_active - nombre de transactions actives
- rcv_req_diff - nombre de demandes reçues au cours des cinq dernières minutes
- fwd_req_diff - nombre de demandes transmises au cours des cinq dernières minutes
- 2xx_trans_diff - nombre de transactions réussies au cours des cinq dernières minutes
Les statistiques sont enregistrées toutes les cinq minutes, vous pouvez modifier l'intervalle en mettant à jour le paramètre "timer" du module de chronométrage.



L'URL pour la vue web a le format "/siremis/ser/charts_cgname/cg=cgname", où cgname est la valeur de l'attribut name pour un ChartGroup, dans notre cas c'est 'shm'. La variable spéciale {@home:url} est remplacée par Siremis avec l'adresse du serveur et l'URL de base du déploiement de Siremis (par exemple, c'est '/siremis' dans une installation par défaut).
Pour rendre la nouvelle entrée visible dans le menu, le module ser de Siremis doit être rechargé, allez dans le panneau d'administration, Menu Application => Modules => Gestion des modules, sélectionnez 'ser' dans la liste et cliquez ensuite sur le bouton 'Recharger'. Retournez dans le panneau d'administration du SIP et l'entrée devrait être visible dans le groupe de menu "Services de cartes".


CAPTURES D'ÉCRAN DES GRAPHIQUES
Ensuite, trois captures d'écran des graphiques présentés :
- utilisateurs en ligne vs nombre de contacts - le groupe de graphiques usrloc 
- le rapport sur les relevés de services de localisation


Une caractéristique très utile de Siremis est la possibilité d'ajouter rapidement des vues pour la gestion des tables de la base de données. Il fournit un ensemble de scripts PHP qui peuvent être exécutés en ligne de commande. Le fait de fournir quelques paramètres au script principal permet de créer la vue en quelques instants.
La plupart des tables utilisées par Kamailio sont déjà couvertes par la distribution existante de Siremis, il en manque encore certaines (qui devraient être ajoutées dans le futur), mais dans de nombreux cas vous pouvez avoir des tables personnalisées utilisées par Kamailio (via le module sqlops par exemple).
Nous présentons ici les étapes à suivre pour ajouter de nouvelles vues web pour les tables de base de données.


Allez à siremis/bin/toolx dans le répertoire Siremis.
Là, vous devez exécuter gen_meta.php, en donnant comme paramètre l'ID de connexion à la base de données (pour la base de données Kamailio, c'est Serdb), le nom de la table et l'ID du sous-module Siremis.
La commande suivante montre comment la vue pour la table mtree a été générée :
php gen_meta.php Serdb mtree ser.rtg.mtree
Dans cet exemple, l'ID du sous-module Siremis est ser.srv.mtree, ce qui signifie
- il fait partie du module Siremis ser (où se trouvent tous les composants liés à Kamailio) - les formulaires générés doivent se trouver dans le répertoire siremis/modules/ser/srv/mtree/
- pratiquement, si vous remplacez le point (.) par une barre oblique, l'ID du sous-module Siremis correspond au chemin d'accès à l'intérieur du répertoire siremis/modules
Si vous regardez à l'intérieur de siremis/modules/ser/srv/mtree/, il y a deux sous-répertoires : - do - spécifications des objets de données
- formulaire - spécifications des formulaires web - ajout, édition, copie, visualisation ou recherche de fiches d'arbres
Un autre fichier généré est le Siremis Web View pour la gestion des arbres. Il se trouve à l'adresse suivante
siremis/modules/ser/view/MtreeListView.xml
Il comprend les références aux objets Form utilisés pour cette vue.

SUBST
Define fournit un mécanisme de remplacement des jetons autonomes. Il est parfois utile de pouvoir remplacer à l'intérieur d'une chaîne la valeur d'un jeton.
Par exemple, vous ne pouvez pas définir MYID à remplacer dans la ligne suivante :
xlog("imprimer la valeur de MYID\n") ;
Dans ce cas, MYID est une sous-chaîne du paramètre de la fonction xlog(), ce n'est pas un élément autonome du fichier de configuration.
La solution à ces cas est fournie par la directive subst preprocessor, dont le prototype est similaire aux expressions de substitution SED ou Perl :
#!subst "<sep> regexp <sep> subst <sep> flags"
Il comporte quatre éléments :
- <sep> - un seul caractère à utiliser comme séparateur entre les autres composantes. Parmi les séparateurs couramment utilisés : "/", "%" ou "#
- regexp - expression régulière à faire correspondre à l'intérieur de la chaîne de caractères des valeurs - subst - valeur de substitution pour remplacer les jetons correspondants
- drapeaux - drapeaux pour contrôler la substitution, un élément optionnel. Les drapeaux peuvent être une combinaison de :
- i - pour correspondre à la chaîne de caractères en mode insensible à la casse
- g - pour remplacer toutes les correspondances dans une valeur de chaîne, pas seulement la première (globale
remplacement)
Pour remplacer MYID par Kamailio dans l'exemple précédent, il faut définir la directive subst comme
#!subst "/MYID/Kamailio/"
SUBSTDEF




La directive du préprocesseur, les paramètres globaux et les paramètres des modules ont une importance au moment du démarrage de Kamailio. Les parties du fichier de configuration qui sont exécutées au moment de l'exécution consistent en ce qu'on appelle des blocs de routage.
Un bloc de routage est une liste d'actions qui sont exécutées lors d'événements spécifiques, tels que : - réception d'une demande SIP
- Réponse du SIP reçue
- événements de la minuterie
- succursale sortante à transmettre
- l'impossibilité d'obtenir un repos de 200 ok pour une transaction SIP
- demande locale à transmettre
- Le dialogue SIP a été lancé ou interrompu
- les destinations des expéditeurs sont en panne ou sont remises en ligne
Chaque bloc de routage a un nom réservé, définissant son type, et peut inclure un identifiant au sein du groupe, ses actions se situant entre les accolades :












