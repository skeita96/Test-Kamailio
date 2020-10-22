## USAGUSAGE IN DEFAULT CONFIGURATION FILE

Les paramètres définis pour le module sont les suivants :
- db_url - défini pour le jeton défini à l'URL du serveur de base de données
- db_mode - défini à 1 pour activer la mise en cache interne de la fonction allow_trusted(), qui n'est pas liée à l'utilisation de la table d'adresses (celle-ci est toujours mise en cache)
allow_source_address() fait correspondre l'IP et le port source avec les enregistrements mis en cache à partir de l'adresse de la table de la base de données. Son prototype est :
allow_source_address("group_id")
Le group_id peut être un entier statique ou une variable contenant un entier qui représente l'ID du groupe d'adresses à utiliser pour la correspondance. Il est facultatif, lorsqu'il manque, l'ID de groupe 1 est utilisé.
Par conséquent, la condition dans le bloc IF de la route [AUTH] se lit comme suit : si ce n'est pas REGISTER et que la requête a été envoyée depuis l'une des adresses présentes dans le groupe 1 des enregistrements de la table de base de données "address", alors retournez au bloc request_route, en sautant les prochaines actions de la route [AUTH] qui font l'authentification de l'utilisateur.
Le fichier de configuration par défaut considère que tous les enregistrements doivent être authentifiés par un nom d'utilisateur et un mot de passe.


## L'UTILISATION DES RÈGLES DE CORRESPONDANCE D'ADRESSES

La fonction allow_source_address() utilise les attributs de l'adresse source pour faire correspondre les enregistrements. Il existe une autre fonction qui prend l'adresse IP et le port comme paramètres, permettant d'utiliser n'importe quelle variable pour fournir ces valeurs. Son prototype est :

            allow_address(“group_id”, “ipaddr”, “port”)

Practically allow_source_address() is equivalent to:

    allow_address(“1”, “$si”, “$sp”)
    
 Pour obtenir la valeur de la colonne de balises dans le fichier de configuration, le paramètre peer_tag_avp doit être défini sur le nom d'un AVP, par exemple :
   
      modparam("permissions", "peer_tag_avp", "$avp(tag)”)
      
  Compte tenu des enregistrements ajoutés dans les exemples précédents de ce chapitre, si la demande est envoyée à partir de 1.2.3.4, après l'appel de la fonction allow_source_address(), la valeur de $avp(tag) est la chaîne "mediasrv".
D'autres fonctions utiles de ce module sont :
- allow_source_address_group() - elle renvoie l'ID de groupe des enregistrements correspondants par rapport à l'IP source et au port du paquet
- allow_address_group("ipaddr", "port") - il renvoie l'ID de groupe des enregistrements correspondants en fonction des paramètres de l'adresse IP et du port
Ces fonctions passent en revue tous les enregistrements de la table d'adresses, vérifient s'il y a une correspondance et renvoient la valeur de la colonne "grp" lorsque cela se produit.
Un cas d'utilisation courant des règles d'accès IP est d'accorder la connectivité RTC à des pairs de confiance. Le fichier de configuration par défaut ne l'autorise que pour les utilisateurs locaux. Pour l'étendre aux pairs de confiance énumérés dans le groupe d'adresses 1, mettez à jour la route [PSTN] en suivant l'exemple suivant :

# only local users and trusted peers allowed to call 

          if(from_uri!=myself || ( ! allow_source_address() ) ) {
          sl_send_reply("403", "Not Allowed");
          exit; }
Outre la mise à jour du commentaire, l'expression IF a été étendue avec :

          || ( ! allow_source_address() )
      

La signification de l'expression complète est la suivante : si l'appelant n'est pas un utilisateur local ou si l'appel n'est pas envoyé par un pair de confiance, alors il faut rejeter l'appel avec une réponse 403.
Pour un autre exemple, pour montrer quand la valeur de la balise peut être utile pour le routage SIP, considérons les exigences suivantes :
- toutes les demandes SIP doivent être autorisées sur la base d'adresses IP de confiance
- Les requêtes provenant d'adresses IP spécifiques doivent être acheminées vers un certain serveur SIP. Il peut s'agir d'un serveur de périphérie, répartissant le trafic en fonction de l'IP d'origine.
Bien que de nombreuses parties puissent être supprimées du fichier de configuration par défaut, ce qui le rend très petit, nous présentons où de nouvelles actions peuvent être branchées pour obtenir la fonctionnalité souhaitée.
L'adresse IP où envoyer le trafic est stockée dans la colonne #tag de la table de base de données "address" (dont la définition permet des chaînes de caractères jusqu'à 64 caractères, ce qui est suffisant même pour les adresses IPv6).
Tout d'abord, il faut ajouter les enregistrements dans la base de données, nous donnons ensuite quelques exemples génériques, en acceptant d'acheminer le trafic de 1.2.3.4 à 4.5.6.7 et le trafic de 1.2.3.5 à 4.5.6.8 :

          kamctl address add 1 1.2.3.4 32 0 “4.5.6.7” 
          kamctl address add 1 1.2.3.5 32 0 “4.5.6.8”

Au début de l'itinéraire [AUTH], nous ajoutons la condition d'accepter ou de rejeter le trafic en fonction de l'IP source :

#IP authorization and user uthentication 
            route[AUTH] {
            if(allow_source_address()) {
            #source IP allowed
            return;
            }
            sl_send_reply(“403”, “Forbidden”); 
            exit;
            #!ifdef WITH_AUTH


Les actions testent l'IP source et s'il y a une correspondance avec les enregistrements de la table d'adresses, alors elle retourne au bloc request_route pour continuer le traitement. Sinon, il envoie une réponse 403 et arrête l'exécution du fichier de configuration (pratiquement, les prochaines actions de la route [AUTH] ne seront jamais exécutées).
Après l'exécution de route(AUTH) dans le bloc request_route, la balise $avp(tag) est fixée à l'adresse IP où faire suivre la requête. Les actions suivantes doivent être ajoutées pour effectuer la redirection :


        $du = “sip:” + $avp(tag);
        route(RELAY);
         exit;
         # dispatch requests to foreign domains


Pour plus de souplesse dans le routage, la balise column peut stocker les ID du groupe d'équilibrage de charge dans le module dispatcher ou du groupe de routage au moindre coût dans le module lcr, pour acheminer le trafic à partir d'adresses IP spécifiques en utilisant les règles du dispatcher ou de lcr.


## RÈGLES DE CORRESPONDANCE DES ADRESSES IP VIA D'AUTRES MODULES

Il n'est pas question d'élaborer toutes les autres options pour effectuer la correspondance d'adresses IP, juste une courte liste de plusieurs modules qui exportent des fonctions qui effectuent de telles opérations :

- le module dispatcher exporte une fonction qui peut être utilisée pour faire correspondre l'adresse IP source à celle de destination
- Le module lcr exporte des fonctions qui peuvent être utilisées pour faire correspondre l'adresse IP source ou la destination avec les adresses de ses passerelles
- le module de routage exporte des fonctions qui peuvent être utilisées pour faire correspondre l'adresse IP source ou la destination avec les adresses de ses passerelles
- d'autres modules de stockage génériques, tels que htable ou mtree, peuvent être utilisés pour stocker une liste d'adresses IP afin de les comparer
- Le module sdpops peut être utilisé pour faire correspondre les adresses IP directement avec les enregistrements de la base de données, en utilisant des instructions de requête SQL
- Le module geoip peut être utilisé pour faire correspondre une adresse IP à des pays et des régions du monde entier, en fournissant les outils nécessaires pour mettre en œuvre les règles d'accès IP basées sur ces adresses.
Vous trouverez la documentation relative à ces modules à l'adresse suivante
- http://kamailio.org/docs/modules/4.2.x/

## Services d'enregistrement et de localisation

Le bureau d'enregistrement et les services de localisation sont fournis par deux modules ensemble :
- usrloc - le module qui gère les enregistrements de localisation et les systèmes de stockage
- registrar - le module d'exportation du fichier de configuration permet de sauvegarder et de consulter les enregistrements d'emplacement
Il existe un autre module qui peut être utilisé à la place de usrloc, respectivement p_usrloc qui se concentre sur le stockage des enregistrements dans des bases de données partitionnées. Nous allons présenter plus en détail les modules registrar et usrloc, mais faisons d'abord une brève présentation de l'enregistrement SIP.


## INSCRIPTION SIP 

L'enregistrement SIP s'accompagne de demandes de REGISTER qui annoncent une ou plusieurs adresses de contact pour un utilisateur représenté par une adresse d'enregistrement (AoR).
Le processus d'enregistrement typique est effectué en même temps que l'authentification de l'utilisateur, pour s'assurer que des utilisateurs malveillants n'enregistrent pas des contacts au nom d'autres utilisateurs. La plupart des téléphones SIP disponibles aujourd'hui enregistrent une adresse de contact à la fois. Il s'agit de l'URI composée de l'IP locale, du port et du transport utilisés pour la communication avec le serveur SIP.
Le digramme suivant montre le flux de messages pour un enregistrement avec authentification de l'utilisateur

<img src="/images/sip01.png" alt="SIP register">


La réponse positive à une demande d'enregistrement comprend toutes les en-têtes de contact associées à l'utilisateur qui effectue l'enregistrement.
L'exemple suivant montre une demande de REGISTRE SIP (envoyée par un téléphone Snom) et sa réponse 200 :

                        ## @@@@@message register@@@@@@@@@@@@
                        
#Registrar# dessert le domaine kamailio.lab, qui est présent dans l'URI de la requête. L'adresse d'enregistrement de l'utilisateur impliqué dans l'enregistrement est spécifiée par l'URI dans l'en-tête To.
L'adresse de contact est portée dans l'en-tête Contact, qui, outre l'URI SIP, peut inclure de nombreux paramètres, liés aux extensions de localisation telles que GRUU et Outbound ou aux méthodes de requête SIP prises en charge. Le téléphone d'Alice a l'adresse IP locale 192.168.178.22 et utilise le port 1056 pour communiquer avec le serveur SIP via UDP.
Les requêtes REGISTER incluent également la validité de l'adresse de contact, présente dans l'en-tête Expire sous la forme d'un nombre entier positif indiquant le nombre de secondes.
Une bonne pratique consiste à s'assurer que l'expéditeur de la demande REGISTER (l'adresse de l'en-tête From) est le même que l'utilisateur de l'enregistrement (l'adresse de l'en-tête TO). Le SIP autorise différents utilisateurs, mais il vaut mieux l'interdire à moins que vous ne sachiez ce que vous faites. Le fichier de configuration par défaut de Kamailio fait cette vérification lors de l'authentification de l'utilisateur.
La réponse 200 est en miroir de l'URI de l'en-tête Contact, en spécifiant le délai d'expiration accepté pour celui-ci, car le serveur peut diminuer la valeur reçue du dispositif.


Les enregistrements doivent être actualisés avant l'expiration du délai, sinon le serveur SIP supprimera l'enregistrement de sa base de données de localisation.
Le désenregistrement se fait par le biais d'une requête REGISTER avec la même adresse de contact, mais cette fois la valeur Expire est fixée à 0, comme dans l'exemple suivant.

<img src="/images/sip02.png" alt="SIP register">

La réponse 200 ne comporte pas d'en-tête Contact car elle a été supprimée des enregistrements de localisation par la demande "un-REGISTER", Alice devenant injoignable à partir de ce moment.
Un utilisateur peut s'enregistrer avec plusieurs appareils en même temps, en ayant plus d'une adresse de contact dans la base de données de localisation. Lorsqu'il est appelé, le serveur SIP crée des branches parallèles à tous ses appareils, ce qui entraîne une sonnerie simultanée. C'est ce que l'on appelle le #parallel #forking et il est effectué automatiquement par Kamailio lors de l'utilisation du transfert d'état.


# MODULE REGISTRAR

C'est le module qui exporte les fonctions de gestion des services d'enregistrement et de localisation à partir du fichier de configuration. Il se lie au module usrloc pour stocker et récupérer les enregistrements de localisation et au module sl pour pouvoir envoyer des réponses SIP. La documentation du module est disponible à l'adresse suivante :
- http://kamailio.org/docs/modules/4.2.x/modules/registrar.html

Deux sont les plus utilisées de ses fonctions :
- save(table, flags, uri) - qui est utilisée pour traiter les demandes d'enregistrement, mettre à jour les enregistrements de localisation avec les adresses de contact et générer une réponse appropriée. La table représente le nom de la structure en mémoire où les enregistrements d'emplacement doivent être sauvegardés ou, dans le cas d'un backend de base de données, le nom de la table de la base de données. Les drapeaux et les paramètres d'uri sont des options qui peuvent être utilisées pour contrôler le comportement de la fonction et fournir l'AoR à utiliser pour le traitement de l'enregistrement
- lookup(table, uri) - qui est utilisé pour traiter les demandes SIP qui doivent être livrées aux abonnés locaux. Il prend l'AoR du paramètre URI ou uri de la demande et recherche dans la base de données de localisation identifiée par le paramètre table les adresses de contact correspondantes
Les fonctions save(...) et location(...) sont utilisées en paire et le premier paramètre doit avoir la même valeur.
Le module fournit un nombre important de paramètres qui contrôlent la fonctionnalité interne. Par exemple, vous pouvez spécifier :
- si les fonctions lookup(...) doivent créer des branches pour tous les enregistrements d'emplacement ou n'utiliser que la première (activation/désactivation de la fonction #parallel #forking à tous les dispositifs enregistrés)
- les valeurs minimales et maximales des échéances
- activer/désactiver la gestion des extensions du bureau d'enregistrement telles que Path ou GRUU, entre autres fonctionnalités exportées par le module du bureau d'enregistrement :
- vérifier si un abonné est enregistré ou non
- Désinscrire un abonné
- récupérer les contacts d'un abonné et les rendre disponibles via des variables de configuration

### LIMITER LE NOMBRE DE CONTACTS

Bien que le SIP permette d'enregistrer autant de contacts qu'un abonné peut le faire, il est bon de fixer une certaine limite pour éviter que des clients non autorisés n'enregistrent un grand nombre d'adresses. De plus, il est assez courant que les fournisseurs de services VoIP n'autorisent qu'un seul contact par abonné.
Il existe peu d'options pour fixer de telles limites. Tout d'abord, vous pouvez fixer la limite supérieure pour tout le monde via le paramètre de module "max_contacts". Disons qu'elle doit être de 5 :

            modparam("registrar", "max_contacts", 5)



Si vous souhaitez avoir un seul contact par abonné, il suffit de régler la valeur du paramètre du module sur 1 :
modparam("registrar", "max_contacts", 1)
Lorsque ce paramètre est défini, la fonction save(...) n'accepte pas de nouveaux contacts s'il y a déjà un nombre de contacts correspondant à la limite. De plus, la valeur est valable pour tous les contacts, vous ne pouvez pas l'ajuster par abonné.
Si vous voulez pouvoir définir le nombre de contacts par abonné, vous devez définir le paramètre xavp_cfg :
modparam("registrar", "xavp_cfg", "reg")
Et puis, avant d'appeler la sauvegarde, définissez le nombre de contacts dans la variable de configuration $xavp(reg=>max_contacts), disons que vous voulez 3 contacts pour l'abonné identifié par l'en-tête To de la demande d'enregistrement en cours :

            $xavp(reg=>max_contacts) = 3; 
            save(“location”);


Vous pouvez charger la valeur pour le nombre maximum de contacts à partir du profil de l'utilisateur, via le paramètre load_credentials du module auth_db. Tout d'abord, ajoutez une nouvelle colonne entière nommée "max_contacts" dans la table des abonnés, où vous pouvez définir la valeur de la limite, puis dans le fichier de configuration :

            modparam("auth_db", "load_credentials", "$avp(max_contacts)=max_contacts") .....
            if($avp(max_contacts)!=$null) {
            $xavp(reg=>max_contacts) = $avp(max_contacts); }
            save(“location”); .....

L'utilisation du paramètre max_contacts pourrait ne pas être utile dans les réseaux mobiles, où les appareils perdent la connectivité sans fil, puis obtiennent de nouvelles adresses IP et s'enregistrent à nouveau sans pouvoir désenregistrer les contacts précédents. Il peut en résulter un état où les contacts inaccessibles se trouvent dans le tableau de localisation et où les contacts plus récents (qui sont joignables) sont rejetés. Les extensions GRUU viennent pallier ce problème, mais il existe de nombreux appareils qui ne le mettent pas en œuvre.
La solution dans ce cas, seulement si vous voulez un contact par abonné, est d'utiliser le paramètre flags de la fonction save(), avec le flag 0x04 activé, comme :

            save("location", "0x04") ;
            
Tous les contacts précédents sont supprimés et celui de la demande d'enregistrement actuelle est enregistré dans la base de données de localisation. Cette méthode permet des réglages par abonné, certains pouvant être traités avec un seul contact et d'autres avec plusieurs contacts :

            modparam("auth_db", "load_credentials", "$avp(max_contacts)=max_contacts") .....
            if($avp(max_contacts)!=$null && $avp(max_contacts)>1) {
            $xavp(reg=>max_contacts) = $avp(max_contacts);
            save(“location”); } 
            else {
            save(“location”, “0x4”); 
            }
           
 Une autre façon de fixer des limites au nombre de contacts est de récupérer tous les contacts dans des variables et de les boucler dans le fichier de configuration, exemple à montrer dans une autre sous-section.
 
 TEST D'INSCRIPTION

Il est parfois utile de savoir si un utilisateur est enregistré sans rien changer aux demandes SIP actuellement traitées. La fonction lookup() met à jour l'URI de la demande et ajoute des branches supplémentaires, si c'est le cas.
Juste pour tester si un abonné est enregistré ou non, la fonction #registrar #module exports registered(table, uri). La table est le nom du stockage du service de localisation, il doit être le même que pour save(...) ou lookup(...). Le paramètre URI est optionnel et identifie l'abonné pour lequel il faut rechercher des contacts. Si le paramètre URI est manquant, l'adresse de l'URI de la requête est utilisée.
Pour fournir un exemple pratique en plus du fichier de configuration par défaut, **nous voulons autoriser les appels uniquement des abonnés enregistrés. Par conséquent, dans la route [AUTH], après que l'appelant soit identifié, nous ajoutons la vérification pour voir si l'URI de l'en-tête From a des contacts valides dans les enregistrements de localisation :**



            if( ! registered(“location”, “$fu”)) {
                        sl_send_reply(“403”, “Forbidden - register first”);
                        exit; 
            }
            #user authenticated - remove auth header
            
La variable $fu renvoie l'URI de l'en-tête From et la condition pour le bloc IF est vraie lorsqu'il n'y a pas de contact valide pour celui-ci (notez l'opérateur de négation).

## LA RECHERCHE DE CONTACTS DANS LES VARIABLES DU FICHIER DE CONFIGURATION

La fonction reg_fetch_contacts(table, uri, profil) peut être utilisée pour extraire tous les contacts de l'AoR dans le paramètre uri. Le profil est utilisé comme identifiant pour accéder aux attributs à l'intérieur de la pseudo-variable $ulc(...).
L'exemple suivant consiste à imprimer les détails récupérés pour tous les contacts dans les enregistrements de localisation appartenant à l'expéditeur de la demande :

                       if(reg_fetch_contacts("location", "$fu", "src")) {
                        xlog("the AoR of sender:
                        xlog("the location table name:
                        xlog("the hash code of AoR:
                        xlog("the number of contacts for AoR: $(ulc(src=>count))\n"); $var(i) = 0;
                        while($var(i) < $(ulc(src=>count)))
                        {
                        xlog("--- counter value [$var(i)]\n");
                        xlog("the contact address:
                        xlog("the path headers:
                        xlog("the received address:
                        xlog("the value for expires:
                        xlog("the Call-ID header:
                        xlog("the Q priority:
                        xlog("the CSeq value:
                        xlog("the internal flags:
                        xlog("the script branch flags:
                        xlog("the User-Agent header:
                        xlog("the local socket:
                        xlog("the time of last update:
                        xlog("the bitmask with supported methods: $(ulc(src=>methods)[$var(i)])\n"); 
                        $var(i) = $var(i) + 1;
                        } 
                      }
En pratique, la plupart de ce qui est associé à l'abonné dans les enregistrements du tableau de localisation est accessible via la variable pseduo $ulc(...).
Pour fournir un autre exemple d'utilisation, le bloc suivant présente comment mettre en place des limites au nombre de contacts par abonné. Il suppose que la valeur $avp(max_contacts) est chargée à partir de la table des abonnés via le paramètre load_credentials, comme dans l'un des exemples précédents.

            #Check if maximum registered UA's exceeded 
            if (reg_fetch_contacts("location", "$tu", "reg")) {
                        $var(i) = 0;
                        $var(found) = 0;
                        if($ulc(reg=>count)>0 && is_present_hf("Contact") && $hdr(Contact)!=”*”) {
                        $var(contact) = $(ct{tobody.uri});
                        while($var(found) == 0 && $var(i) < $ulc(reg=>count)) {
                        if($var(contact)==$(ulc(reg=>addr)[$var(i)])) $var(found) = 1;
                        else
                        $var(i) = $var(i) + 1;
                        } }
                        if ($var(found) == 0 && is_present_hf("Contact") && $hdr(Contact)!=”*”) { 
                        #check against max val
                        if($ulc(reg=>count)>=$avp(max_contacts))
                        {
                        xlog("Too Many Registrations\n"); sl_send_reply("403", "Too Many Registrations"); 
                        exit;
                        }

                        } 

                       }
           
 Tout d'abord, les contacts associés à l'URI de l'en-tête To sont récupérés dans le profil "reg" des variables $ulc(...). Si de tels contacts existent et que la requête REGISTER possède également un en-tête Contact avec adresse, alors l'URI de l'en-tête Contact est pris et comparé aux adresses des contacts de la variable $ulc(...), en utilisant l'instruction WHILE pour boucler tous les enregistrements. Si elle est trouvée, cela signifie que l'enregistrement actuel est un rafraîchissement d'un enregistrement précédent, donc il ne compte pas pour la limite, car il n'ajoute pas de nouvel enregistrement.
Si l'adresse de contact de la requête REGISTER n'est pas trouvée, alors le nombre de contacts est testé pour voir s'il va dépasser la limite $avp(max_contacts) lorsque le nouvel enregistrement est ajouté, en rejetant l'enregistrement avec la réponse 403, si c'est le cas..



