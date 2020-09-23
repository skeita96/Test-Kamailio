# Accounting ( Comptabilité )


Kamailio est capable de stocker des détails sur les événements qui sont traités au niveau de la signalisation SIP. Il pourrait y avoir trois backends de stockage :
- le fichier syslog
- soutenu par une base de données 
- Serveur RADIUS
Un quatrième, le serveur DIAMETER, a été développé avant que la spécification DIAMETER ne devienne un RFC et n'est pas entretenu.
En fonction des options du fichier de configuration, Kamailio peut envoyer des enregistrements comptables à tous les backends ou seulement à une sélection d'entre eux. Dans le fichier de configuration par défaut, le backend syslog est activé par défaut et la base de données est sauvegardée en tant qu'option d'activation via une directive du préprocesseur.
Le module prenant en charge l'écriture des événements comptables s'appelle **acc**, son readme est disponible en ligne à l'adresse suivante
• http://kamailio.org/docs/modules/4.2.x/modules/acc.html

# ACCOUNTING DETAILS

La plupart des détails stockés pour chaque événement comptabilisé peuvent être décidés dans le fichier de configuration. Généralement, l'événement comptable est associé à une transaction, le module acc attendant que la transaction soit terminée pour écrire l'enregistrement comptable.
Implicitement, le module acc n'écrit que les détails suivants : - horodatage - temps unix en secondes
- Méthode SIP - prise sur demande, elle indique également le type d'événement pour les appels - INVITE est le début de l'appel et BYE est la fin de l'appel
- le code de la réponse SIP - le code numérique de la réponse SIP - le texte de la raison de la réponse SIP - le texte du statut de la réponse SIP
- Call-Id - la valeur de l'en-tête Call-Id, peut être utilisée pour faire correspondre les événements START et STOP correspondants pour les appels
- From tag - la valeur du paramètre tag dans l'en-tête From, peut être utilisée pour faire correspondre les événements START et STOP correspondants pour les appels
- To tag - la valeur du paramètre tag dans l'en-tête To (extrait de la réponse SIP), peut être utilisée pour faire correspondre les événements START et STOP correspondants pour les appels
Il n'y a aucune information sur l'expéditeur (appelant) ou le destinataire (appelé). Tous les autres détails qui seraient nécessaires doivent être spécifiés via les paramètres du module :
- log_extra - la liste des noms de clés et des variables à imprimer dans syslog pour chaque événement comptabilisé
db_extra - la liste des noms de colonnes et des variables à écrire pour chaque événement comptabilisé
- radius_extra - la liste des AVP RADIUS et les variables à envoyer pour chaque événement comptabilisé
Chacun de ces paramètres a le format de :

                              name1=variable1;name2=variable2;...;nameN=variableN

Par exemple, le fichier de configuration par défaut possède le paramètre log_extra suivant pour le module acc :

                   modparam("acc", "log_extra",
                   "src_user=$fU;src_domain=$fd;src_ip=$si;"
                   "dst_ouser=$tU;dst_user=$rU;dst_domain=$rd")
                   
Avec ce paramètre, lorsqu'Alice appelle Carol, le message suivant est imprimé dans le syslog :  

            ACC: transaction answered: timestamp=1374493797;method=INVITE;from_tag=SvS155QzhrmDG3r- G7IWOxLbXxsyZL6pC;to_tag=xhfffBXKyWXOzkc.0au6Xtt-rjHJrXeB;call_id=vRtGVfXTzMK.Awgi- T2F3JCxv3OR2tWtI;code=200;reason=OK;src_user=alice;src_domain=kamailio.lab;src_ip=192.168.178 .46;dst_ouser=carol;dst_user=carol;dst_domain=192.168.178.47
                   

Les messages SIP correspondants pour cette transaction INVITE sont (les corps SDP ont été dépouillés) :

        INVITE sip:carol@kamailio.lab SIP/2.0.
        Via: SIP/2.0/UDP 192.168.178.46:35052;rport;branch=z9hG4bKPjDFf6QkNHaYyxfhRwme- JRyos5M1orqaF8.
        Max-Forwards: 70.
        From: "alice@kamailio.lab" <sip:alice@kamailio.lab>;tag=SvS155QzhrmDG3rG7IWOxLbXxsyZL6pC. To: <sip:carol@kamailio.lab>.
        Contact: "alice@kamailio.lab" <sip:alice@192.168.178.46:35052;ob>.
        Call-ID: vRtGVfXTzMK.AwgiT2F3JCxv3OR2tWtI.
        CSeq: 15991 INVITE.
        Route: <sip:192.168.178.31;lr>.
        Allow: PRACK, INVITE, ACK, BYE, CANCEL, UPDATE, INFO, SUBSCRIBE, NOTIFY, REFER, MESSAGE, OPTIONS.
        Supported: replaces, 100rel, timer, norefersub.
        Session-Expires: 1800.
        Min-SE: 90.
        User-Agent: CSipSimple_me172v-16/r2225.
        Content-Type: application/sdp.
        Content-Length: 348.
        .
        SIP/2.0 200 OK.
        Via: SIP/2.0/UDP 192.168.178.31;received=192.168.178.31;branch=z9hG4bK6f6c.a054a5e6.0.
        Via: SIP/2.0/UDP 192.168.178.46:35052;rport=35052;branch=z9hG4bKPjDFf6QkNHaYyxfhRwme- JRyos5M1orqaF8.
        Record-Route: <sip:192.168.178.31;lr>.
        Call-ID: vRtGVfXTzMK.AwgiT2F3JCxv3OR2tWtI.
        From: "alice@kamailio.lab" <sip:alice@kamailio.lab>;tag=SvS155QzhrmDG3rG7IWOxLbXxsyZL6pC. To: <sip:carol@kamailio.lab>;tag=xhfffBXKyWXOzkc.0au6Xtt-rjHJrXeB.
        CSeq: 15991 INVITE.
        Allow: PRACK, INVITE, ACK, BYE, CANCEL, UPDATE, INFO, SUBSCRIBE, NOTIFY, REFER, MESSAGE, OPTIONS.
        Contact: "carol@kamailio.lab" <sip:carol@192.168.178.47:39150;ob>.
        Supported: replaces, 100rel, timer, norefersub.
        Session-Expires: 1800;refresher=uac.
        Require: timer.
        Content-Type: application/sdp.
        Content-Length: 300.
       
       Lorsque l'appel est terminé, le message suivant est imprimé dans le syslog pour la transaction BYE :
       
            ACC: transaction answered: timestamp=1374493805;method=BYE;from_tag=SvS155QzhrmDG3rG7I- WOxLbXxsyZL6pC;to_tag=xhfffBXKyWXOzkc.0au6Xtt-rjHJrXeB;call_id=vRtGVfXTzMK.Awgi- T2F3JCxv3OR2tWtI;code=200;reason=OK;src_user=alice;src_domain=kamailio.lab;src_ip=192.168.178 .46;dst_ouser=carol;dst_user=carol;dst_domain=192.168.178.47

The corresponding SIP messages for this BYE transaction are:

BYE sip:carol@192.168.178.47:39150;ob SIP/2.0.
Via: SIP/2.0/UDP 192.168.178.46:35052;rport;branch=z9hG4bKPj-Dci0oV6WSV8kpBE5FWEK9- TU0WNzst4D.
Max-Forwards: 70.
From: "alice@kamailio.lab" <sip:alice@kamailio.lab>;tag=SvS155QzhrmDG3rG7IWOxLbXxsyZL6pC. To: <sip:carol@kamailio.lab>;tag=xhfffBXKyWXOzkc.0au6Xtt-rjHJrXeB.
Call-ID: vRtGVfXTzMK.AwgiT2F3JCxv3OR2tWtI.
CSeq: 15992 BYE.
Route: <sip:192.168.178.31;lr>.
User-Agent: CSipSimple_me172v-16/r2225.
Content-Length: 0.
.
SIP/2.0 200 OK.
Via: SIP/2.0/UDP 192.168.178.31;received=192.168.178.31;branch=z9hG4bK3f6c.599ece17.0.
Via: SIP/2.0/UDP 192.168.178.46:35052;rport=35052;branch=z9hG4bKPj-Dci0oV6WSV8kp- BE5FWEK9TU0WNzst4D.
Call-ID: vRtGVfXTzMK.AwgiT2F3JCxv3OR2tWtI.
From: "alice@kamailio.lab" <sip:alice@kamailio.lab>;tag=SvS155QzhrmDG3rG7IWOxLbXxsyZL6pC. To: <sip:carol@kamailio.lab>;tag=xhfffBXKyWXOzkc.0au6Xtt-rjHJrXeB.
CSeq: 15992 BYE.
Content-Length: 0.


#  TIME VALUES


L'heure stockée par défaut est l'horodatage unix. Dans divers cas, l'heure de l'événement comptable peut nécessiter une précision supérieure à la seconde ou être stockée dans le fuseau horaire GMT (UTC).
Plusieurs paramètres contrôlent le format de l'heure pour chaque enregistrement comptable :
 - mode_heure
- time_attr
- time_exten
 - time_format
Le time_attr et le time_exten précisent le nom des attributs ou des colonnes de la base de données pour stocker les détails de l'heure. Ces colonnes doivent être créées par vous, le type des colonnes dépendant de la valeur de time_mode.
Le time_mode définit le type de la valeur temporelle à stocker :
- 0 - (par défaut), ne sauvegarde que l'horodatage unix pour le syslog et la date-heure pour la base de données. Les colonnes time_attr et time_exten ne sont pas utilisées.
- 1 - enregistrer les secondes dans time_attr et les microsecondes dans time_exten (deux valeurs dans la base de données, toutes deux des nombres entiers). Les deux colonnes time_attr et time_exten doivent être des nombres entiers.
- 2 - sauver des secondes.milisecondes dans time_attr (une valeur dans la base de données, une décimale stockée en double type). La colonne time_attr doit être double.
- 3 - enregistrer l'heure formatée selon le paramètre time_format, en utilisant la sortie de la fonction C localtime(...) (l'heure du fuseau horaire local configuré pour le serveur - une valeur dans la base de données, stockée sous forme de chaîne). La colonne time_attr doit être une chaîne de caractères.
- 4 - enregistrer l'heure formatée selon le paramètre time_format, en utilisant la sortie de la fonction C de gmtime() (l'heure à partir de GMT - une valeur dans la base de données, stockée sous forme de chaîne). La colonne time_attr doit être une chaîne de caractères.
Le paramètre time_format peut être défini comme une chaîne contenant des spécificateurs à remplacer par des attributs de temps, de la même manière que pour la fonction C strftime().

#  LES MÉCANISMES DE COMPTABILITÉ

Il existe deux mécanismes pour rédiger les événements comptables :
- en marquant une transaction SIP d'un drapeau spécial et l'événement comptable sera écrit lorsque cette transaction sera terminée (c'est-à-dire qu'une réponse SIP avec un code supérieur ou égal à 200 a été envoyée en amont)
- par l'exécution d'une fonction exportée par le module acc, chaque fois que le script du fichier de configuration le souhaite, l'événement comptable étant écrit immédiatement


#  ACCOUNTING USING FLAGS

Le fichier de configuration par défaut utilise le mécanisme basé sur les drapeaux. La première étape consiste à indiquer la valeur du drapeau à acc via un paramètre de module. Le drapeau peut être défini pour chaque backend de stockage via différents paramètres :
- log_flag - spécifie quel drapeau est utilisé pour marquer les transactions pour la comptabilité syslog
- db_flag - spécifie quel drapeau est utilisé pour marquer les transactions pour la comptabilité de la base de données - radius_flag - spécifie quel drapeau est utilisé pour marquer les transactions pour la comptabilité du rayon
Lorsque le même drapeau est utilisé, l'événement comptable sera écrit dans de nombreux backends. Les opérations marquées de ce drapeau ne sont comptabilisées que lorsque le code de réponse est 200-299. Pour comptabiliser également les cas d'échec des transactions, un autre indicateur doit être activé, indicateur qui est spécifié par le paramètre failed_transaction_flag.
Le fichier de configuration par défaut de Kamailio écrit les enregistrements comptables implicitement dans syslog et offre une option pour activer la comptabilisation dans la base de données via une directive de préprocesseur, respectivement WITH_ACCDB. Les parties pertinentes du fichier de configuration sont présentées ci-après :


                126. #!define FLT_ACC 1
                127. #!define FLT_ACCMISSED 2
                128. #!define FLT_ACCFAILED 3
                ...
                332. modparam("acc", "log_flag", FLT_ACC) ...
                339. #!ifdef WITH_ACCDB
                340. modparam("acc", "db_flag", FLT_ACC)

En pratique, le drapeau 1 est utilisé pour comptabiliser les transactions réussies et le drapeau 3 est utilisé pour comptabiliser les transactions échouées également (le drapeau 3 ne fonctionne pas seul, le drapeau 1 doit être activé dans ce cas également).
L'indicateur 2 est utilisé pour stocker les détails des appels manqués pour les abonnés locaux et n'est activé que lorsque les appels sont envoyés en fonction de la recherche de l'emplacement de l'utilisateur.
Le fichier de configuration par défaut donne également les instructions SQL pour MySQL afin de créer les colonnes des tables acc et missed_calls. Si vous avez installé Siremis à l'aide de l'assistant, vous n'avez pas besoin d'exécuter les instructions SQL, cela a déjà été fait. La partie suivante du fichier de configuration par défaut explique ce qui doit être fait pour activer la comptabilité et créer des colonnes supplémentaires dans la table de la base de données :

                # *** To enhance accounting execute:
                85. #
                86. #
                87. #
                88. #!ifdefACCDB_COMMENT
                89. ALTER TABLE acc ADD COLUMN src_user VARCHAR(64) NOT NULL DEFAULT '';
                90. ALTER TABLE acc ADD COLUMN src_domain VARCHAR(128) NOT NULL DEFAULT ''; 91. ALTER TABLE acc ADD COLUMN src_ip varchar(64) NOT NULL default '';
                - enable mysql
                - define WITH_ACCDB
                - add following columns to database
                92. ALTER TABLE acc ADD COLUMN dst_ouser VARCHAR(64) NOT NULL DEFAULT '';
                93. ALTER TABLE acc ADD COLUMN dst_user VARCHAR(64) NOT NULL DEFAULT '';
                94. ALTER TABLE acc ADD COLUMN dst_domain VARCHAR(128) NOT NULL DEFAULT '';
                95. ALTER TABLE missed_calls ADD COLUMN src_user VARCHAR(64) NOT NULL DEFAULT '';
                96. ALTER TABLE missed_calls ADD COLUMN src_domain VARCHAR(128) NOT NULL DEFAULT '';
                97. ALTER TABLE missed_calls ADD COLUMN src_ip varchar(64) NOT NULL default '';
                98. ALTER TABLE missed_calls ADD COLUMN dst_ouser VARCHAR(64) NOT NULL DEFAULT '';
                99. ALTER TABLE missed_calls ADD COLUMN dst_user VARCHAR(64) NOT NULL DEFAULT '';
                100. ALTER TABLE missed_calls ADD COLUMN dst_domain VARCHAR(128) NOT NULL DEFAULT '';
                101. #!endif
                
   Les drapeaux de la comptabilité sont mis en place :
- demandes initiales INVITE (marquées uniquement pour stocker les détails des appels auxquels on a répondu, respectivement ils reçoivent 200 réponses ok)
- Demandes BYE (marquées pour stocker les enregistrements de toutes les transactions BYE, y compris celles qui n'obtiennent pas une réponse de 200 ok - pensez ici au cas où la connectivité réseau d'un participant tombe en panne, le BYE de l'autre participant n'obtiendra pas une réponse de 200 ok, mais vous voulez quand même l'enregistrement pour pouvoir obtenir le CDR)
- les demandes initiales INVITE qui sont émises après la recherche de l'emplacement de l'utilisateur (marqué cette fois pour le stockage des détails des appels manqués)
Ensuite, vous trouverez les extraits pertinents du fichier de configuration par défaut, avec les opérations setflag mises en évidence.



                  #account only INVITEs (is_method("INVITE")) {
                  setflag(FLT_ACC); # do accounting
                  if (is_method("BYE")) {
                  setflag(FLT_ACC); # do accounting ...
                  setflag(FLT_ACCFAILED); # ... even if the transaction fails
                  }
                  # if
                  # if
                  when routing via usrloc, log the missed calls also (is_method("INVITE")) {
                  setflag(FLT_ACCMISSED);


Pour agréger les détails de l'enregistrement INVITE avec ceux de l'enregistrement BYE afin d'obtenir un enregistrement de données d'appel, vous pouvez utiliser la procédure de stockage MYSQL kamailio_cdrs() créée par l'assistant d'installation de Siremis. Cette procédure sera détaillée plus loin dans ce chapitre.

#   ACCOUNTING USING FUNCTIONS

Pour chaque backend de stockage, le module acc exporte une fonction pour écrire les informations comptables. Étant donné que ce livre se concentre sur la comptabilité vers syslog et la base de données, les fonctions respectives sont :
- acc_log_request(commentaire)
- acc_db_request(commentaire, tableau)
Le paramètre "commentaire" est un texte défini par le fichier de configuration. Dans le cas où il commence par un nombre à trois chiffres, sa valeur est divisée en deux parties, la première étant enregistrée comme code de réponse SIP et la seconde comme texte de motif de réponse SIP.
Le paramètre "table" représente le nom de la table de base de données dans laquelle l'enregistrement comptable doit être enregistré. Ce paramètre peut être une chaîne dynamique (c'est-à-dire que les variables qui y sont incluses sont évaluées au moment de l'exécution).
Si l'on compare avec les détails enregistrés lors de l'utilisation des drapeaux, peu de valeurs sont différentes :
- l'horodatage est pris au moment de l'exécution, n'attendant plus la réponse SIP
- Le code de réponse SIP est tiré du paramètre de fonction (si le paramètre "commentaire" commence par 3 chiffres suivis d'un espace)
- Le texte du motif de la réponse SIP est tiré du paramètre de fonction (le paramètre "commentaire", à l'exception des trois premiers chiffres et de l'espace blanc suivant, lorsque la valeur correspond à ce motif)
Ces fonctions peuvent être utilisées à la fois pour les demandes SIP et les réponses, en prenant les valeurs du message SIP traité et de son contexte de transaction.
Un exemple de cas d'utilisation serait de remplacer la comptabilité basée sur les drapeaux du BYE par des appels à des fonctions comptables, comme :

        if (is_method("BYE")) {
        acc_log_request(“210 Bye received”); # do accounting to syslog
        acc_db_request(“210 Bye received”, “acc”); # do accounting to database
        }


L'enregistrement est stocké à la réception du BYE, ce qui permet de ne plus se soucier de ne pas recevoir de réponse.
Les fonctions peuvent être utilisées pour écrire des enregistrements comptables pour divers événements au sein d'une même transaction. Même s'il existe de nombreux paramètres du module acc pour comptabiliser automatiquement les premières réponses des médias, les demandes ACK ou CANCEL, les fonctions donnent un contrôle total à l'auteur du fichier de configuration quand les exécuter. Quelques-unes des situations qui peuvent donner des données utiles à des fins comptables ou statistiques :
- au moment de la réception de l'INVITE initiale
- au moment où l'INVITE initiale est envoyée
- lorsque la première réponse provisoire est reçue
- lorsque la réponse à la sonnerie est reçue
Par exemple, le délai de post-communication correspond au décalage horaire par rapport à l'appel initial INVITE et à la sonnerie
réponse.



#  ACCOUNTING STORAGE ENGINES ( MOTEURS DE STOCKAGE COMPTABLE )

Comme nous l'avons déjà dit, Kamailio peut stocker les documents comptables dans plusieurs backends :
- syslog - écrire les enregistrements dans le fichier syslog
- base de données - écrire les enregistrements dans un moteur de base de données
- radius - envoyer les détails à un serveur RADIUS
- diamètre (pas vraiment maintenu, développé lorsque DIAMETER était un projet, pas IETF RFC)


# ACCOUNTING TO SYSLOG


Les enregistrements comptables apparaissent sous forme de messages de journal dans le fichier syslog. Pour écrire l'enregistrement comptable afférent dans syslog, chaque transaction SIP doit être marquée avec le drapeau défini par le paramètre log_flag.
 
        ...
        332. modparam("acc", "log_flag", FLT_ACC) ...
        ...


FLT_ACC is defined to 1 in default kamailio.cfg. To get more that the default accounting details, you have to set the parameter log_extra - default kamailio.cfg uses:

           modparam("acc", "log_extra",
          335. "src_user=$fU;src_domain=$fd;src_ip=$si;"
          336. "dst_ouser=$tU;dst_user=$rU;dst_domain=$rd")
          
  
For an accounted transaction, the syslog message looks like:

          
         ACC: transaction answered: timestamp=1374693742;method=INVITE;from_tag=klsjfuhkjnsadfiusf;to_- tag=osfjklsdfDSRwds;call_id=vRtGVfXTzMK.AwgiT2F3JCxv3OR2tWtI;code=200;reason=OK;sr- c_user=alice;src_domain=kamailio.lab;src_ip=192.168.178.46;dst_ouser=carol;dst_user=carol;dst_do- main=192.168.178.47


Le module acc exporte des paramètres qui permettent de définir différentes valeurs pour la facilité de journalisation (permettant d'obtenir des enregistrements comptables dans un fichier dédié via la configuration de syslog) ainsi que le niveau de journalisation (assurez-vous que sa valeur n'est pas supérieure au paramètre global de débogage afin d'obtenir l'écriture des enregistrements).
Pour obtenir un CDR complet des enregistrements comptables, il faut écrire des outils pour analyser les messages de syslog, faire correspondre les enregistrements BYE et INVITE par call_id, from_tag et to_tag, calculer la durée comme différence entre le temps de BYE et le temps de INVITE.
La comptabilisation dans syslog peut être très utile comme stockage de sauvegarde, en y imprimant moins d'attributs (seulement ceux qui sont pertinents pour la facturation, par exemple, pour être sûr si le backend de la base de données est en panne de façon inattendue).

# ACCOUNTING TO DATABASE ( COMPTABILITÉ À LA BASE DE DONNÉES )

Il s'agit probablement de la solution la plus pratique, car elle permet de générer facilement des rapports à l'aide de requêtes SQL. D'autre part, Kamailio ne dispose pas de backends SQL qui mettent en œuvre son API de base de données interne (par exemple, Cassandra, MongoDB, fichiers texte), couvrant ainsi la plupart des besoins de partage avec d'autres systèmes ou de traitement personnalisé.
Pour écrire l'enregistrement comptable afférent dans la base de données, chaque transaction SIP doit être marquée avec le drapeau défini par le paramètre db_flag.

          ...
          340. modparam("acc", "db_flag", FLT_ACC) 
          ...

Étant le même que celui utilisé pour la comptabilité syslog, FLT_ACC est défini à 1 dans le fichier kamailio.cfg par défaut. Pour obtenir plus que les détails de la comptabilité par défaut, vous devez définir le paramètre db_extra - default kamailio.cfg uses :

          343. modparam("acc", "db_extra",
          344. "src_user=$fU;src_domain=$fd;src_ip=$si;"
          345. "dst_ouser=$tU;dst_user=$rU;dst_domain=$rd")
          
         
 For an accounted INVITE transaction, the database record looks like:
 
 
                      id: 20
                  method: INVITE
                from_tag: vRn7KTHPr 
                to_tag: caKaFr9jmDvSN 
                callid: WtkExv-2o3
                sip_code: 200 s
                ip_reason: OK
                time: 2015-01-01 11:21:54 s
                rc_ip: 192.168.178.48
                dst_ouser: david 
                dst_user: david
                dst_domain: 192.168.178.54 s
                rc_user: alice
                src_domain: kamailio.lab

Once the call is ended, another record for BYE transaction is written:
                        id: 21
                      method: BYE
                from_tag: caKaFr9jmDvSN 
                to_tag: vRn7KTHPr callid: WtkExv-2o3
                sip_code: 200 sip_reason: OK
                time: 2015-01-01 11:22:18 
                src_ip: 192.168.178.48
                dst_ouser: david 
                dst_user: david
                dst_domain: 192.168.178.54
                src_user: alice 
                src_domain: kamailio.lab
                
               
Le champ le plus important pour l'enregistrement BYE est l'heure, qui est utilisée pour calculer la durée de l'appel. La correspondance entre les enregistrements INVITE et BYE appartenant au même appel doit être effectuée à l'aide des colonnes callid, from_tag et to_tag.
Sachez que les valeurs from_tag et to_tag peuvent être interverties dans l'enregistrement BYE si la demande BYE est envoyée par l'appelé, et que vous devez donc également procéder à une correspondance croisée (correspondance entre from_tag de INVITE et to_tag de BYE et entre to_tag de INVITE et from_tag de BYE). Le paramètre detect_direction peut être réglé sur 1 afin que le module acc détecte que le BYE est envoyé par l'appelant et échange les valeurs pour obtenir les mêmes attributs From et To comme pour INVITE.
La signification des colonnes de la table de la base de données acc est présentée dans le tableau suivant :

                    **Name**       **Type**             **Description**
                    id     unsigned  database unique id
                    method    tring   the SIP request type (aka SIP method)
                    from_tag   string  the value for tag parameter in From header
                    to_tag    string    the value for tag parameter in To header
                    callid     string    the value for Call-Id header
                    sip_code  string   the 3 digit SIP code in response
                    sip_reason  string(3)  the text from SIP response
                    time      datetime    time when the accounting event is happening
                    src_ip     string    source IP - the address from where the request was sent
                    dst_ouser    string    the original destination user/callee (username from To URI)
                    dst_user        string    the destination user/callee (username from R-URI)
                    dst_domain    string  the destination domain (domain from R-URI)
                    src_user    string    the source user /caller (username from From URI)
                    src_domain   string  the source domain (domain from From URI)



La manière de digérer les enregistrements comptables et de construire des enregistrements complets de données d'appel est présentée plus en détail dans la section consacrée à la comptabilité à l'aide de Siremis.

#  ACCOUNTING TO RADIUS


De nombreux systèmes de facturation ont été construits pour fonctionner avec RADIUS. Dans ce livre, nous ne l'abordons pas en détail, étant donné que l'accent est mis sur l'intégration avec la base de données. Même s'il est très ancien, c'est une bonne lecture sur ce sujet :
- http://www.kamailio.org/docs/kamailio-radius-1.0.x.html
En fonction de l'intérêt manifesté, une future version de ce livre pourrait inclure ce sujet dans un chapitre dédié



#  ACCOUNTING REMARKS


La comptabilité dans un serveur de signalisation SIP présente des avantages mais aussi des inconvénients. Nous abordons ici les plus importants :
- le serveur n'est pas conscient du contenu des flux de médias, il n'est donc pas possible de stocker les détails du volume de données
- pour la même raison, le serveur de signalisation SIP ne peut pas réagir en cas d'absence de RTP pour marquer la fin de l'appel
- s'il n'est pas configuré comme un proxy à état d'appel (c'est-à-dire s'il n'utilise pas le module de dialogue), le serveur SIP ne peut pas détecter quand l'appelant ou l'appelé est parti (par exemple, en raison d'une déconnexion du réseau). Si un seul est parti, l'autre envoie généralement le BYE et le proxy est capable d'écrire l'enregistrement de fin d'appel (rappelez-vous que pour le BYE, le kamailio.cfg par défaut écrit l'enregistrement comptable même en cas d'échec de la transaction).
- En écrivant des enregistrements pour chaque événement, les données comptables ne sont pas exposées à une perte en cas de basculement à haute disponibilité ou de panne du serveur SIP. Les événements de démarrage et d'arrêt peuvent être enregistrés indépendamment par différents serveurs
- En général, la plupart des détails sont déterminés lors de l'établissement de l'appel, étant présents dans les enregistrements de l'acc INVITE. Les informations peuvent ensuite être supprimées de la mémoire, le compte BYE n'étant pertinent que pour les attributs du dialogue SIP et l'horodatage.




