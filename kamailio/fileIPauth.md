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

<img src="/images/sip02" alt="SIP register">















   
