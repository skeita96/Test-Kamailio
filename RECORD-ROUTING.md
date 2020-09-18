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
- les récepteurs d'interface de contrôle - les processus traitant les commandes MI/RPC, ils peuvent être :
- récepteur FIFO
- Récepteur TCP/UDP/UNIXSOCK - Récepteur XMLRPC
