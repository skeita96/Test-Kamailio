# Dépannage SIP et Kamailio 

Ce chapitre présente plusieurs outils et mécanismes qui peuvent aider à dépanner le fichier de configuration de Kamailio et le routage SIP.

## CAPTURE DU TRAFIC SIP

La possibilité de corréler les messages du journal avec le trafic SIP est, dans la plupart des cas, très utile. Bien qu'ils ne soient pas présentés de manière exhaustive, voici des détails sur plusieurs outils et commandes qui peuvent être utilisés pour capturer le trafic réseau, dont certains sont adaptés aux paquets SIP.
La liste a sélectionné ceux qui sont disponibles gratuitement et étant open source, il y en a beaucoup avec une licence commerciale, une recherche sur le web devrait facilement les révéler.
La plupart d'entre eux, sinon tous, acceptent la syntaxe du filtre de paquets de Berkeley (BPF) pour faire correspondre le trafic réseau à la capture :

- http://en.wikipedia.org/wiki/Berkeley_Packet_Filter 
- http://biot.com/capstats/bpf.html

### NGREP

Outil assez ancien et petit, packagé par la plupart des distributions Linux et BSD bien connues, ngrep est un outil en ligne de commande adapté pour capturer et visualiser en temps réel le trafic réseau en texte clair. Il est particulièrement utile pour travailler à distance via ssh.
Le site web du projet est :

- http://ngrep.sourceforge.net

Outre la possibilité d'imprimer immédiatement sur le terminal, ngrep peut écrire les paquets capturés dans un fichier pcap. S'il est capturé sur un serveur distant, le fichier pcap peut être téléchargé et analysé avec d'autres outils. Les filtres peuvent être effectués sur les attributs d'adresse (tels que le port source ou de destination, le protocole de transport ou l'adresse IP) et sur les expressions régulières correspondantes du contenu du paquet.
Quelques commandes utiles pour examiner le trafic SIP : 
- capture de tout sur le port 5060


    ngrep -d any -qt -W byline ".*" port 5060
    
    - capture des paquets sur le port 5060 qui ont le mot "sip" - cela peut être utile si vous avez des keepalives NAT UDP (généralement 4 octets apparaissant périodiquement)

    ngrep -d any -qt -W byline "sip" port 5060
    
 - ne saisir que les paquets SIP qui sont destinés aux enregistrements - saisir à la fois les demandes et les réponses
 
      ngrep -d any -qt -W byline “CSeq: [0-9]+ REGISTER” port 5060
      
- capturer tous les paquets SIP qui pourraient faire partie d'un appel

    ngrep -d any -qt -W byline "CSeq: [0-9]+ (INVITE|ACK|CANCEL|BYE)" port 5060
    
- capturer tous les paquets SIP dont l'en-tête ou le corps contient le mot "alice" de l'utilisateur

      ngrep -d any -qt -W byline "alice" port 5060
      
- capturer tous les paquets SIP qui ont un alice utilisateur à l'intérieur de l'en-tête

          ngrep -d any -qt -W byline “From:.*sip:alice@” port 5060
          
- saisir tous les SIP provenant d'un IP particulier (par exemple, 1.2.3.4)
    
        ngrep -d any -qt -W byline ".*" host 1.2.3.4

- pour plus d'options, voir la page du manuel du ngrep
Notez que les commandes ci-dessus peuvent nécessiter des réglages dans divers cas, par exemple, certaines d'entre elles reposent sur la correspondance de l'en-tête From, mais cet en-tête peut avoir la forme abrégée "f". De plus, le schéma du protocole dans les URI SIP (par exemple, dans l'URI de l'en-tête From) peut être sip, sips, tel ou d'autres valeurs.
Le trafic SIP est généralement sur le port 5060, si vous utilisez Kamailio sur un autre port, vous devez ajuster la valeur dans les commandes ngrep. Ngrep peut filtrer sur plusieurs ports en même temps, vous pouvez utiliser une règle comme

    ngrep -d any -qt -W byline “.*” port 5060 or port 5064 or port 5068
    
Sur différents systèmes, "-d any" ne fonctionne pas, le nom de l'interface doit être spécifié, par exemple "-d eth2".
Si vous souhaitez capturer le trafic envoyé depuis/vers un appareil spécifique enregistré, vous pouvez consulter l'emplacement de l'utilisateur et obtenir l'adresse IP de l'appareil reçu (si l'appareil est derrière NAT) ou l'adresse de contact :

        kamctl ul show alice
        ngrep -d any -qt -W byline “.*” host _ALICE_DEVICE_IP_


 
## WIRESHARK

C'est probablement l'outil graphique le plus connu pour l'analyse du trafic réseau. Il comprend certaines fonctionnalités dédiées à la VoIP, notamment la possibilité d'afficher un diagramme avec les flux de messages SIP ainsi que la relecture de l'audio de la capture réseau d'un appel VoIP.

The website of the project is:
• https://www.wireshark.org

Le projet Wireshare dispose de pages wiki dédiées aux appels VoIP et SIP, avec des informations utiles sur les
détails et références :

- http://wiki.wireshark.org/VoIP_calls
- http://wiki.wireshark.org/SIP













      
 
    
