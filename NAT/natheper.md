# Rtpproxy

Ce module offre les outils permettant de contrôler l'application RTPProxy pour le relais des flux de médias et de mettre à jour les parties correspondantes dans la signalisation SIP. La documentation du module est disponible en ligne à l'adresse suivante
- http://kamailio.org/docs/modules/4.2.x/modules/rtpproxy.html Parmi les fonctionnalités fournies :
- la possibilité d'équilibrer la charge des flux à travers un groupe d'applications RTPProxy - la possibilité de travailler avec de nombreux groupes d'applications RTPProxy
- la capacité à établir un pont entre les flux de médias entre les réseaux (par exemple, du réseau privé au réseau public ou d'IPv4 à IPv6)
- possibilité de sauvegarder le flux média localement
- possibilité de diffuser des paquets RTP dans le cadre d'un appel (par exemple, musique d'attente) - possibilité d'exécuter une commande RPC en cas de dépassement du délai RTP
- re-packettisation du trafic RTP
En ce qui concerne la traversée NAT, les opérations effectuées par le module sont les suivantes :
- contacter le RTPProxy pour récupérer l'adresse IP et les ports à utiliser pour le relais des paquets RTP
- mettre à jour le corps du SDP avec les attributs reçus de RTPProxy
- ajouter une ligne de marquage "a=nortpproxy:yes" pour signaler qu'un relais RTP est utilisé pour l'appel - dire à l'application RTPProxy de détruire une session de relais de flux média
L'une des fonctions exportées par le module est rtpproxy_manage(...). Elle est utilisée dans le fichier de configuration par défaut et tente de traiter automatiquement les cas les plus courants. D'autres fonctions exportées telles que rtpproxy_offer(), rtpproxy_answer() ou unforce_rtp_proxy() peuvent être utilisées lorsque davantage de contrôle est nécessaire pour gérer le trafic SIP.
La fonction rtpproxy_manage(...) a deux paramètres optionnels :
- flags - il contrôle le comportement interne sur ce qui doit être mis à jour et l'interaction avec l'application RTPProxy - les valeurs possibles sont documentées dans le readme du module (lien vers celui-ci fourni ci-dessus)
- ipaddr - l'adresse IP qui doit être utilisée pour mettre à jour le corps du SDP
Selon le type de la requête SIP ou le code de la réponse SIP, la fonction rtpproxy_manage(...) donne à l'application RTPProxy l'instruction de lancer, de démarrer ou de détruire une session de relais de flux de médias. Traduit avec www.DeepL.com/Translator (version gratuite)

# RTPPROXY APPLICATION

RTPProxy est une application open source écrite en C utilisée pour relayer les paquets RTP. La page web du projet est :
- http://www.rtpproxy.org
Kamailio contrôle RTPProxy par le biais d'un protocole personnalisé, en interagissant avec lui pour :
- ouvrir une session de relais RTP - mettre à jour une session de relais RTP - terminer une session de relais RTP Le schéma ci-dessus montre la relation entre les terminaux, les routeurs NAT, Kamailio et le proxy RTP pendant une session de communication en temps réel. Le canal de signalisation des messages SIP passe par Kamailio et le canal média des paquets RTP passe par le proxy RTP.
Outre le simple relais des paquets RTP UDP, prêt à l'emploi ou via des correctifs dans le domaine public, RTPProxy offre d'autres fonctionnalités telles que l'enregistrement des flux RTP, le paiement de musique d'attente, la reconditionnement ou des commandes de rappel pour le timeout RTP.

#  RTPPROXY INSTALLATION


Le plus simple est d'installer RTPProxy à partir d'un paquet, faisant partie de nombreuses distributions Linux. Pour Debian/Ubuntu, la commande est

              apt-get install rtpproxy 
              
tous les paramètres sont pris en ligne de commande.
Vous devez personnaliser la prise de contrôle à utiliser pour communiquer avec Kamailio, ce qui doit être fourni par le paramètre de ligne de commande '-s'. Par défaut, il s'agit d'un fichier de socket unix. Le fichier de configuration de Kamailio donne un exemple avec un socket réseau qui doit être utilisé lorsque RTPProxy fonctionne sur une machine différente de Kamailio. Par exemple, en utilisant 127.0.0.1 et le port 7722 pour communiquer avec Kamailio :
          
          rtpproxy -s udp:127.0.0.1:7722 ...
          
 L'installation des sources requiert les opérations standard pour toute application Linux : téléchargement, configuration, création et installation :
 
                mkdir -p /usr/local/src/rtpproxy
                cd /usr/local/src/rtpproxy
                wget http://b2bua.org/chrome/site/rtpproxy-1.2.1.tar.gz tar xvfz rtpproxy-1.2.1.tar.gz
                cd rtpproxy-1.2.1
                ./configure
                make
                make install

L'application Rtpproxy est déployée sur /usr/local/bin/rtpproxy.
Un des chapitres suivants montre comment la démarrer pour l'utiliser avec le fichier de configuration par défaut de Kamailio.



#      REGISTRATION THROUGH NAT ( ENREGISTREMENT PAR LE BIAIS DE NAT )


L'enregistrement SIP est effectué par le SIP UA pour faire connaître leur emplacement physique en termes d'IP, de port et de protocole. Lorsque l'UA est derrière le NAT, l'IP est privée, et non pas routable depuis le réseau public.
Il ne suffit pas de conserver uniquement la relation entre l'adresse AoR et l'adresse de contact de l'UA pour pouvoir envoyer des appels ou d'autres demandes SIP à cet UA.
L'implémentation du bureau d'enregistrement de Kamailio stocke dans l'emplacement les attributs nécessaires pour pouvoir acheminer les demandes via le routeur NAT vers l'UA, respectivement :
- dans la colonne reçue, il stocke l'IP source, le port et le protocole du paquet réseau, qui est pratiquement la prise externe du routeur NAT
- dans la colonne socket, il stocke l'IP, le port et le protocole de la socket locale où le paquet réseau a été reçu

Le schéma ci-dessus montre le flux de messages pour un enregistrement SIP impliquant un routeur NAT au milieu - l'en-tête Contact dans la réponse 200 OK inclut le paramètre received qui reflète l'adresse IP du routeur NAT et le port utilisé pour la communication avec Kamailio.
Lorsque Kamailio en tant que bureau d'enregistrement est déployé derrière un autre proxy SIP, les sauts intermédiaires doivent alors ajouter les en-têtes Path afin de faire fonctionner la traversée NAT. Kamailio stocke la liste des en-têtes Path dans la colonne Path.
Un enregistrement par NAT est reflété dans la demande d'enregistrement suivante et sa réponse.

                    REGISTER sip:kamailio.lab SIP/2.0
                    Via: SIP/2.0/UDP 10.0.0.180:57207;rport;branch=z9hG4bKPjfD55KnvC7LEjXL7C6Rgi.zwCYu8FzQ3i Max-Forwards: 70
                    From: <sip:alice@kamailio.lab>;tag=84x96mIBMpd00z8EnRsbYHib7F9PKEG7
                    To: <sip:alice@kamailio.lab>
                    Call-ID: SrIV6iMvJNePTjMMeI4amEGW5s7dke8F
                    CSeq: 64683 REGISTER
                    User-Agent: myphone
                    Contact: <sip:alice@10.0.0.180:57207>
                    Expires: 300
                    Content-Length: 0
                    .....
                    SIP/2.0 200 OK
                    Via: SIP/2.0/UDP 10.0.0.180:57207;rport=57207;  
                    To: <sip:alice@kamailio.lab>;tag=b27e1a1d33761e85846fc98f5f3a7e58.cc51
                    Call-ID: SrIV6iMvJNePTjMMeI4amEGW5s7dke8F
                    CSeq: 64683 REGISTER
                    Contact: <sip:alice@10.0.0.180:57207>;expires=300;received="sip:200.0.0.1:18948" Server: kamailio (4.0.2 (x86_64/linux))
                    Content-Length: 0
                    

La demande d'enregistrement contient l'adresse IP privée du téléphone d'Alice dans Via et Contact. Kamailio ajoute à la réponse SIP l'IP source et le port de Via (dans les paramètres rport et received) ainsi que l'en-tête de Contact (dans le paramètre received).
L'UA indique par le paramètre rport vide dans REGISTER qu'il veut être informé dans la réponse de l'IP source et du port des demandes, une extension SIP définie dans la RFC3581.
Lorsqu'un appel est dirigé vers l'UA respectif, au lieu d'envoyer à l'adresse du contact à partir de l'enregistrement de localisation, Kamailio envoie l'INVITE à l'adresse stockée dans la colonne reçue. Le routeur NAT reçoit le message SIP et le transmet à l'UA dans le réseau privé, en fonction de ses règles internes de mise en correspondance des adresses.
Comme de nombreux routeurs NAT détruisent les relations de mappage d'adresses s'il n'y a pas de trafic, Kamailio peut être configuré pour envoyer des paquets keepalive, sous forme de données UDP factices ou de demandes SIP OPTIONS. Le second consomme plus de bande passante, mais crée un trafic entrant et sortant par le trou d'épingle du routeur NAT, ce qui est la solution pour les routeurs NAT très restrictifs qui nécessitent un trafic sortant pour maintenir le trou d'épingle ouvert.
Il existe des implémentations SIP UA qui peuvent également envoyer des paquets keepalive, option qu'il est préférable d'utiliser car elle répartit la charge de construction et d'envoi de ces paquets. Parmi les autres options envisagées pour garder le trou d'épingle NAT ouvert, on peut réduire le temps d'enregistrement à de courts intervalles, par exemple toutes les 30 secondes. Mais cette solution peut surcharger le serveur du bureau d'enregistrement SIP, car les enregistrements de localisation sont mis à jour chaque fois qu'un REGISTRE demande à être enregistré.


#    VOIP CALLS THROUGH NAT (APPELS VOIP VIA NAT)

Un appel VoIP implique un canal de signalisation et des flux de médias. Kamailio peut fixer les paquets de signalisation pour pouvoir acheminer tous les messages SIP d'un appel par NAT et peut utiliser une application de relais RTP (par exemple, RTPProxy) pour le proxy des flux média.
Le schéma ci-dessus présente le canal de signalisation en trait plein et le canal média en pointillé. En ce qui concerne le canal de signalisation et la traversée NAT, les opérations de Kamailio impliquent :
- l'ajout de l'IP reçue et du port à l'en-tête Via
- ajout du paramètre "nat=yes" à l'en-tête Record-Route. - ajout du paramètre "alias" dans l'en-tête Contact
- mise à jour de l'IP et du port pour le flux média dans le corps du SDP
- si la destination se trouve également derrière la NAT, l'adresse R-URI est mise à jour à son adresse locale et l'adresse proxy sortante interne de Kamailio pour la requête est définie à l'adresse IP et au port du routeur NAT
L'exemple suivant montre une demande INVITE natted entrante, suivie de la version sortante de celle-ci, après avoir été traitée par Kamailio pour la traversée NAT.
   
   
                      INVITE sip:bob@kamailio.lab SIP/2.0.
                      Via: SIP/2.0/UDP 10.0.0.180:4490;branch=z9hG4bK-bceivun5qmd3;rport. From: <sip:alice@kamailio.lab>;tag=srog6pqc7g.
                      To: <sip:bob@kamailio.lab>.
                      Call-ID: 3c6c6479b739-mfgugsanywka.
                      CSeq: 2 INVITE.
                      Max-Forwards: 70.
                      Contact: <sip:alice@10.0.0.180:4490;line=gm4aihxb>.
                      User-Agent: myua.
                      Content-Type: application/sdp.
                      Content-Length: 409.
                      .
                      v=0.
                      o=root 557346261 557346261 IN IP4 10.0.0.180.
                      s=call.
                      c=IN IP4 10.0.0.180.
                      t=0 0.
                      m=audio 56014 RTP/AVP 8 0 9 2 3 18 4 101.
                      a=direction:both.
                      a=rtpmap:8 PCMA/8000.
                      a=rtpmap:0 PCMU/8000.
                      a=rtpmap:9 G722/8000.
                      a=rtpmap:2 G726-32/8000.
                      a=rtpmap:3 GSM/8000.
                      a=rtpmap:18 G729/8000.

                      a=fmtp:18 annexb=no.
                      a=rtpmap:4 G723/8000. a=rtpmap:101 telephone-event/8000. a=fmtp:101 0-16.
                      a=ptime:20.
                      a=sendrecv
                      INVITE sip:bob@10.20.0.40:28220;line=k3hsfrp SIP/2.0.
                      Record-Route: <sip:90.0.0.1;lr=on;nat=yes>.
                      Via: SIP/2.0/UDP 90.0.0.1;branch=z9hG4bKa081.3f69ba36.0.
                      Via: SIP/2.0/UDP 10.0.0.180:4490;received=200.0.0.1;branch=z9hG4bK-bceivun5qmd3;rport=4490. From: <sip:alice@kamailio.lab>;tag=srog6pqc7g.
                      To: <sip:bob@kamailio.lab>.
                      Call-ID: 3c6c6479b739-mfgugsanywka.
                      CSeq: 2 INVITE.
                      Max-Forwards: 69.
                      Contact: <sip:alice@10.0.0.180:4490;alias=200.0.0.1~4490~1;line=gm4aihxb>. User-Agent: myua.
                      Content-Type: application/sdp.
                      Content-Length: 429.
                      .
                      v=0.
                      o=root 557346261 557346261 IN IP4 90.0.0.1.
                      s=call.
                      c=IN IP4 90.0.0.1.
                      t=0 0.
                      m=audio 51164 RTP/AVP 8 0 9 2 3 18 4 101.
                      a=direction:both.
                      a=rtpmap:8 PCMA/8000.
                      a=rtpmap:0 PCMU/8000.
                      a=rtpmap:9 G722/8000.
                      a=rtpmap:2 G726-32/8000.
                      a=rtpmap:3 GSM/8000.
                      a=rtpmap:18 G729/8000.
                      a=fmtp:18 annexb=no.
                      a=rtpmap:4 G723/8000.
                      a=rtpmap:101 telephone-event/8000.
                      a=fmtp:101 0-16.
                      a=ptime:20.
                      a=sendrecv.
                      a=nortpproxy:yes.
                      
                      
Après avoir passé par Kamailio avec RTPProxy, le corps du SDP a une ligne 'a=' supplémentaire, respectivement :
a=nortpproxy:oui.
Cette ligne est utilisée comme marqueur pour indiquer aux prochains sauts dans la signalisation qu'une instance RTPProxy se charge de relayer les flux RTP pour l'appel, il n'est donc pas nécessaire d'avoir une autre instance.
Lors de la gestion d'une réponse SIP, les seuls attributs affectés pour la gestion de la traversée NAT sont 
- En-tête de contact pour ajouter le paramètre "alias".
- L'organe du SDP va mettre à jour l'IP et le port pour le flux de médias











