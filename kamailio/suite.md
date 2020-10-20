## MISE À JOUR DE L'IDENTIFICATION DE L'APPELANT AVEC LES AFFECTATIONS

L'utilisation du module UAC ajoute une surcharge en stockant les valeurs initiales et nouvelles des attributs de l'en-tête From soit dans le cookie d'en-tête Record-Route, soit dans les variables du module de dialogue. Dans de nombreux déploiements, seuls les dispositifs conformes à la RFC3261 sont autorisés, ce qui signifie que la mise à jour des attributs de l'en-tête From et leur non restauration ne créent aucun dommage.
Dans de tels cas, il suffit de remplacer les attributs d'en-tête From pour le premier INVITE seulement, car c'est celui qui définit l'identification de l'appelant dans l'historique des appels des dispositifs. En comparaison avec l'exemple relatif à la normalisation de l'ID de l'appelant de l'une des sections précédentes, la fonction uac_replace_from(...) doit être remplacée par :MISE À JOUR DE L'IDENTIFICATION DE L'APPELANT AVEC LES AFFECTATIONS

L'utilisation du module UAC ajoute une surcharge en stockant les valeurs initiales et nouvelles des attributs de l'en-tête From soit dans le cookie d'en-tête Record-Route, soit dans les variables du module de dialogue. Dans de nombreux déploiements, seuls les dispositifs conformes à la RFC3261 sont autorisés, ce qui signifie que la mise à jour des attributs de l'en-tête From et leur non restauration ne créent aucun dommage.
Dans de tels cas, il suffit de remplacer les attributs d'en-tête From pour le premier INVITE seulement, car c'est celui qui définit l'identification de l'appelant dans l'historique des appels des dispositifs. En comparaison avec l'exemple relatif à la normalisation de l'ID de l'appelant de l'une des sections précédentes, la fonction uac_replace_from(...) doit être remplacée par :


          $fn = $var(caller);
          $fu = “sip:” + $var(caller) + “@” +$fd;
          
Pour l'anonymat, lorsqu'on veut qu'aucun message SIP ne porte d'indication sur l'appelant, on peut exécuter pour toutes les demandes (initiales ou dans le dialogue) les actions suivantes avant de passer au saut suivant :

              if(!has_totag() || is_direction(“downstream”)) { 
              $fn = “Unknown”;
              $fu = “sip:anonymous@invalid”;
              }

La fonction is_direction(...) est exportée par le module rr et peut détecter si la requête va de l'appelant à l'appelé (en aval) ou de l'appelé à l'appelant (en amont).

