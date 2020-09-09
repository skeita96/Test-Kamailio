# Caller ID Management

L'identification de l'appelant est considérée comme étant l'utilisateur présenté dans l'en-tête De. Le nom d'affichage et la partie URI doivent indiquer qui est l'appelant.
La modification de l'URI de l'en-tête From est pratiquement interdite par le SIP RFC 3261, car il était utilisé pour la correspondance des dialogues dans les spécifications précédentes du SIP. Dans la nouvelle RFC, seul le paramètre From header tag est utilisé pour la correspondance de dialogue, donc les changements de nom d'affichage ou d'URI ne l'affectent pas. Mais la RFC3261 impose de préserver la rétrocompatibilité, juste au cas où il y aurait des appareils SIP non conformes à la RFC3261.
Il existe des extensions au SIP qui spécifient de nouveaux en-têtes, respectivement P-Asserted-Identity et P- Prefererred-Identity and Privacy, pour porter l'identité affirmée de l'appelant avec le drapeau de confidentialité (pour le présenter ou non à l'appelé, pour les appels anonymes). Mais, là encore, ces extensions ne sont pas mises en œuvre dans tous les téléphones SIP.
Dans de nombreux cas, les gens préfèrent encore mettre à jour l'en-tête From, comme une solution qui fonctionne toujours. Dans ce chapitre, nous examinons plusieurs options pour le faire. Le module Readme for UAC est disponible en ligne à l'adresse suivante

**À PARTIR DES VARIABLES D'EN-TÊTE**

Le corps entier de l'en-tête From est récupéré par $hdr(From). Il existe plusieurs autres variables pour obtenir des attributs à l'intérieur de l'en-tête :
- $fu - URI dans l'en-tête From
- $fU - nom d'utilisateur dans l'URI de l'en-tête From - $fd - domaine dans l'URI de l'en-tête From
- $fn - afficher le nom dans l'en-tête From
- $ft - paramètre de balise dans l'en-tête From
Elles étaient auparavant des variables en lecture seule, mais une version plus récente permet d'attribuer des valeurs à $fu, $fU, $fd et $fn. Cependant, vous devez être très prudent lorsque vous leur attribuez de nouvelles valeurs, car elles utilisent le mécanisme de blocs détaillé dans la section SIP Parser.
Cela signifie que l'affectation ne supprime pas immédiatement l'ancienne valeur et fixe la nouvelle valeur. Au lieu de cela, il marque pour suppression l'ancienne valeur et la nouvelle valeur est ajoutée dans la liste des opérations pour mettre à jour le contenu du message SIP.
Si vous devez mettre à jour plusieurs fois l'un des attributs de l'en-tête From via les assignations, utilisez msg_apply_changes() après chaque opération :

        $fU = “newuser”; 
        msg_apply_changes();
        
  Il est moins performant (pas vraiment perceptible si vous n'en abusez pas), mais plus sûr en termes de résultat.
  
  **FROM HEADER UPDATE AND AUTOMATIC RESTORING**
  
  
C'est probablement la façon recommandée de mettre à jour les attributs de l'en-tête From. Le nom d'affichage et l'URI sont changés en de nouvelles valeurs lors de l'envoi en aval, étant restaurés dans leur version originale lorsque les messages sont envoyés en amont.
Le module UAC offre la possibilité de remplacer et de restaurer automatiquement les en-têtes From. Le module dépend du module rr, qui stocke un cookie avec les valeurs originales de From dans l'en-tête Record-Route.
La fonction à exécuter pour les mises à jour de l'en-tête From est :
uac_replace_from(dysplayname, uri)
Le paramètre "Display name" est facultatif, les deux paramètres peuvent inclure des pseudo-variables.
Un cas d'utilisation typique consiste à normaliser le numéro d'identification de l'appelant au format international, afin que l'appel puisse être renvoyé à partir de l'historique des téléphones.
L'exemple suivant montre la normalisation d'un numéro d'appel de Berlin (indicatif régional 30), Allemagne (indicatif de pays 49), au format international, en remplaçant le nom d'affichage et le nom d'utilisateur de l'en-tête From par la nouvelle valeur :


                      loadmodule “rr.so”
                      loadmodule “uac.so”
                      ....
                      $var(caller) = $fU;
                      if($var(caller) =~ ”^[0-9]{5,15}$” || $var(caller) =~ ”^\+[1-9][0-9]{5,15}$”) {
                      if($var(caller) =~ ”^[1-9]”) { $var(caller) = “+4930” + $rU;
                      } else if ($var(caller) =~ ”^0[1-9]”) {
                      $var(caller) = “+49” + $(var(caller){s.strip,1});
                      } else if ($var(caller) =~ ”^00[1-9]”) { $var(caller) = “+” + $(var(caller){s.strip,2});
                      } else if ( ! ( $var(caller) =~ ”^\+” ) ) { xlog(“invalid caller ID number $fU\n”); send_reply(“404”, “Not found”);
                      exit;
                      }
                      } else {
                      xlog(“invalid caller ID number $fU\n”); send_reply(“403”, “Not allowed”); exit;
                      }
                      uac_replace_from(“$var(caller)”, “sip:$var(caller)@$fd”);
                      ...
                      
  La normalisation se fait à l'aide de $var(caller) qui est initialement réglé sur From header username. Vous ne devez pas attribuer de valeurs multiples à $fU ou à une autre pseudo-variable liée à l'en-tête From,
car il en résultera une concaténation de ces valeurs au lieu d'un remplacement (rappelez-vous encore le mécanisme des grumeaux de la section SIP Parser).
Si le module de dialogue est chargé, uac stockera les valeurs originales et les nouvelles valeurs dans les variables de dialogue, au lieu du cookie dans l'en-tête Record-Route.

**IDENTIFICATION DE L'APPELANT ANONYME**

Un autre cas d'utilisation typique consiste à définir l'identification anonyme de l'appelant, ce qui est aussi simple que l'exécution pour chaque INVITE initial :

          uac_replace_from("Unknown", "sip:anonymous@invalid") ;

Bien entendu, le nom d'affichage et l'URI peuvent être définis aux valeurs que vous souhaitez pour l'anonymisation.



**MISE À JOUR DE L'IDENTIFICATION DE L'APPELANT AVEC LES AFFECTATIONS**
L'utilisation du module UAC ajoute une surcharge en stockant les valeurs initiales et nouvelles des attributs de l'en-tête From soit dans le cookie d'en-tête Record-Route, soit dans les variables du module de dialogue. Dans de nombreux déploiements, seuls les dispositifs conformes à la RFC3261 sont autorisés, ce qui signifie que la mise à jour des attributs de l'en-tête From et leur non restauration ne créent aucun dommage.
Dans de tels cas, il suffit de remplacer les attributs d'en-tête From pour le premier INVITE seulement, car c'est celui qui définit l'identification de l'appelant dans l'historique des appels des dispositifs. En comparaison avec l'exemple relatif à la normalisation de l'ID de l'appelant de l'une des sections précédentes, la fonction uac_replace_from(...) doit être remplacée par :

              $fn = $var(caller) ;
              $fu = "sip :" + $var(caller) + "@" +$fd ;

Pour l'anonymat, lorsqu'on veut qu'aucun message SIP ne porte d'indication sur l'appelant, on peut exécuter pour toutes les demandes (initiales ou dans le dialogue) les actions suivantes avant de passer au saut suivant :

                if(!has_totag() || is_direction("downstream")) {
                $fn = "Unknown" ;
                $fu = "sip:anonymous@invalid" ;
                }

La fonction is_direction(...) est exportée par le module rr et peut détecter si la requête va de l'appelant à l'appelé (en aval) ou de l'appelé à l'appelant (en amont).


    **User Authentication**
    
_APERÇU DE L'AUTHENTIFICATION SIP_

Le mécanisme d'authentification des utilisateurs pour le SIP est emprunté à HTTP, respectivement à l'authentification www digest - RFC2617. Il s'agit d'un paradigme défi-réponse :
- UA envoie la requête sans aucune authentification
- le serveur répond avec un défi, en ajoutant l'en-tête avec les attributs à utiliser pour
construire des justificatifs d'authentification
- UA envoie à nouveau la demande en ajoutant l'en-tête avec les données d'authentification - le serveur accepte ou refuse l'authentification
Si le serveur est le point de terminaison (par exemple, le bureau d'enregistrement), il doit demander l'autorisation www, en répondant par une réponse 401. Si le serveur est un relais (par exemple, un proxy), il doit demander l'autorisation du proxy, en répondant par 407.
Le diagramme suivant montre le flux de messages SIP d'autorisation www pour l'enregistrement sur le serveur kamailio.org et les en-têtes impliqués dans le processus :

                IMAGE ...
                
    

Sur le chemin de l'appelant à l'appelé, une demande SIP peut être contestée pour authentification par de nombreux sauts. Il n'y a pas beaucoup de téléphones SIP qui supportent de tels scénarios, mais c'est quelque chose de possible du point de vue des spécifications. Il est plus courant que l'utilisateur s'authentifie auprès d'un serveur (son serveur d'origine) et que les nœuds intermédiaires suivants dans le chemin se fassent confiance par adresse IP.
Le schéma suivant montre un cas de double authentification, l'une par un proxy et la seconde par un serveur de média (qui termine l'appel) :


