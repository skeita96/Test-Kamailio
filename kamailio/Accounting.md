# Comptabilité (Accounting )

Kamailio est capable de stocker des détails sur les événements qui sont traités au niveau de la signalisation SIP. Il pourrait y avoir trois backends de stockage :
- le fichier syslog
- soutenu par une base de données 
- Serveur RADIUS
Un quatrième, le serveur DIAMETER, a été développé avant que la spécification DIAMETER ne devienne un RFC et n'est pas entretenu.
En fonction des options du fichier de configuration, Kamailio peut envoyer des enregistrements comptables à tous les backends ou seulement à une sélection d'entre eux. Dans le fichier de configuration par défaut, le backend syslog est activé par défaut et la base de données est sauvegardée en tant qu'option d'activation via une directive du préprocesseur.
Le module prenant en charge l'écriture des événements comptables s'appelle acc, son readme est disponible en ligne à l'adresse suivante
- http://kamailio.org/docs/modules/4.2.x/modules/acc.html

## DÉTAILS COMPTABLES

La plupart des détails stockés pour chaque événement comptabilisé peuvent être décidés dans le fichier de configuration. Généralement, l'événement comptable est associé à une transaction, le module acc attendant que la transaction soit terminée pour écrire l'enregistrement comptable.
Implicitement, le module acc n'écrit que les détails suivants : 
- horodatage - temps unix en secondes
- Méthode SIP - prise sur demande, elle indique également le type d'événement pour les appels - INVITE est le début de l'appel et BYE est la fin de l'appel
- Code de la réponse SIP - le code numérique de la réponse SIP 
- Texte de la raison de la réponse SIP - le texte du statut de la réponse SIP
- Call-Id - la valeur de l'en-tête Call-Id, peut être utilisée pour faire correspondre les événements START et STOP correspondants pour les appels
- From tag - la valeur du paramètre tag dans l'en-tête From, peut être utilisée pour faire correspondre les événements START et STOP correspondants pour les appels
- To tag - la valeur du paramètre tag dans l'en-tête To (extrait de la réponse SIP), peut être utilisée pour faire correspondre les événements START et STOP correspondants pour les appels
Il n'y a aucune information sur l'expéditeur (appelant) ou le destinataire (appelé). Tous les autres détails qui seraient nécessaires doivent être spécifiés via les paramètres du module :
- log_extra - la liste des noms de clés et des variables à imprimer dans syslog pour chaque événement comptabilisé
- db_extra - la liste des noms de colonnes et des variables à écrire pour chaque événement comptabilisé
- radius_extra - la liste des AVP RADIUS et les variables à envoyer pour chaque événement comptabilisé
Chacun de ces paramètres a le format de :

    name1=variable1;name2=variable2;...;nameN=variableN
    
Par exemple, le fichier de configuration par défaut possède le paramètre log_extra suivant pour le module acc :

            modparam("acc", "log_extra",
            335. "src_user=$fU;src_domain=$fd;src_ip=$si;"
            336. "dst_ouser=$tU;dst_user=$rU;dst_domain=$rd")
            

Avec ce paramètre, lorsqu'Alice appelle Carol, le message suivant est imprimé dans le syslog :


        CC: transaction answered: timestamp=1374493797;method=INVITE;from_tag=SvS155QzhrmDG3r- G7IWOxLbXxsyZL6pC;to_tag=xhfffBXKyWXOzkc.0au6Xtt-rjHJrXeB;call_id=vRtGVfXTzMK.Awgi- T2F3JCxv3OR2tWtI;
        code=200;reason=OK;src_user=alice;src_domain=kamailio.lab;src_ip=192.168.178 .46;dst_ouser=carol;dst_user=carol;dst_domain=192.168.178.47
        
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

      ACC: transaction answered: timestamp=1374493805;method=BYE;from_tag=SvS155QzhrmDG3rG7I- WOxLbXxsyZL6pC;to_tag=xhfffBXKyWXOzkc.0au6Xtt-rjHJrXeB;call_id=vRtGVfXTzMK.Awgi- T2F3JCxv3OR2tWtI;code=200;reason=OK;src_user=alice;src_domain=kamailio.lab;src_ip=192.168.178 .46;dst_ouser=carol;
      dst_user=carol;dst_domain=192.168.178.47 
      
Les messages SIP correspondants pour cette transaction BYE sont : 

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



## VALEURS TEMPORELLES 

L'heure stockée par défaut est l'horodatage unix. Dans divers cas, l'heure de l'événement comptable peut nécessiter une précision supérieure à la seconde ou être stockée dans le fuseau horaire GMT (UTC).
Plusieurs paramètres contrôlent le format de l'heure pour chaque enregistrement comptable : 
- #time_mode#
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

## LES MÉCANISMES DE COMPTABILITÉ

Il existe deux mécanismes pour rédiger les événements comptables :
- en marquant une transaction SIP d'un drapeau spécial et l'événement comptable sera écrit lorsque cette transaction sera terminée (c'est-à-dire qu'une réponse SIP avec un code supérieur ou égal à 200 a été envoyée en amont)
- par l'exécution d'une fonction exportée par le module acc, quand le script du fichier de configuration le souhaite, l'événement comptable étant écrit immédiatement


## COMPTABILITÉ À L'AIDE DE DRAPEAUX

Le fichier de configuration par défaut utilise le mécanisme basé sur les drapeaux. La première étape consiste à indiquer la valeur du drapeau à acc via un paramètre de module. Le drapeau peut être défini pour chaque backend de stockage via différents paramètres :
- log_flag - spécifie quel drapeau est utilisé pour marquer les transactions pour la comptabilité syslog
- db_flag - spécifie quel drapeau est utilisé pour marquer les transactions pour la comptabilité de la base de données 
- radius_flag - spécifie quel drapeau est utilisé pour marquer les transactions pour la comptabilité de rayon
Lorsque le même drapeau est utilisé, l'événement comptable sera écrit dans de nombreux backends. Les opérations marquées de ce drapeau ne sont comptabilisées que lorsque le code de réponse est 200-299. Pour comptabiliser également les cas d'échec de la transaction, un autre indicateur doit être activé, indicateur qui est spécifié par le paramètre failed_transaction_flag.
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


            84. # *** To enhance accounting execute:
            85. #
            86. #
            87. #
            88. #!ifdefACCDB_COMMENT
            89. ALTER TABLE acc ADD COLUMN src_user VARCHAR(64) NOT NULL DEFAULT '';
            90. ALTER TABLE acc ADD COLUMN src_domain VARCHAR(128) NOT NULL DEFAULT ''; 91. ALTER TABLE acc ADD COLUMN src_ip varchar(64) NOT NULL default '';
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

}
            #account only INVITEs 
            if(is_method("INVITE")) {
            setflag(FLT_ACC); #do accounting
            }
            
            if (is_method("BYE")) {
            setflag(FLT_ACC); #do accounting ...
            setflag(FLT_ACCFAILED); #... even if the transaction fails
            }
            
            #when routing via usrloc, log the missed calls also  
            
            if (is_method("INVITE")) {
            setflag(FLT_ACCMISSED);

      }




Pour agréger les détails de l'enregistrement INVITE avec ceux de l'enregistrement BYE afin d'obtenir un enregistrement de données d'appel, vous pouvez utiliser la procédure de stockage MYSQL **kamailio_cdrs()** créée par l'assistant d'installation de Siremis. Cette procédure sera détaillée plus loin dans ce chapitre.
COMPTABILITÉ À L'AIDE DE FONCTIONS

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









                
                  
                      
                        
                          




            
