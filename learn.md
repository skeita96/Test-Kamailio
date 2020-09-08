# Fichier de configuration 
Le fichier de configuration par défaut est un très bon point de départ pour la plupart des déploiements impliquant Kamailio, les parties telles que le traitement initial, 
les demandes de routage au sein du dialogue ou l'authentification peuvent être facilement extraites et réutilisées.
Cependant, quelques exemples très simples peuvent aider à entrer dans la logique de la construction des fichiers de configuration.# Building Configuration Files


Les demandes SIP nécessitent une action explicite pour être transmises, donc
la "sortie" de l'exécution de la configuration sans action de transmission équivaut simplement à un abandon, mais l'action "abandon" peut être utilisée dans le même but dans le bloc request_route.
D'autre part, la réponse SIP est automatiquement acheminée sur la base des adresses dans les en-têtes Via, vous devez donc exécuter 
une action "drop" explicite afin de la marquer comme non-transmise pour le noyau Kamailio.
Le simple fait de tout laisser tomber n'est que pour le plaisir, alors essayons de construire quelque chose qui devienne utile.


# _RÉPONDRE TOUJOURS DE MANIÈRE SÉLECTIVE_


Un autre cas d'utilisation pour les tests est de répondre avec des codes de statut différents basés sur des critères différents. Par exemple, 
si c'est **INVITE, BYE ou CANCEL** répondre avec **200 OK**, si c'est MESSAGE répondre avec **202 Accepted** et pour le reste répondre avec **403 Forbbiden** :


      loadmodule “textops.so”
      request_route {
        if(is_method(“INVITE|BYE|CANCEL”)) { 
        sl_send_reply(“200”, “OK”);
        } 
        else if(is_method(“MESSAGE”)) { sl_send_reply(“202”, “Accepted”);
        } 
        else  {
        sl_send_reply(“403”, “Forbidden”);
        } 
       }
       
    
Le module Textops est chargé pour la fonction is_method(), qui peut tester
le type de requête basé sur l'ID interne, pour un ou plusieurs d'entre eux en même temps. 
Le noyau exporte le mot-clé "method" qui peut être utilisé pour comparer la méthode SIP sous forme de chaîne de caractères, de sorte que,
d'un point de vue fonctionnel, la configuration ci-dessus est équivalente à :
       loadmodule “sl.so” 
       request_route {
      if(method==“INVITE” || method==”BYE” || method==”CANCEL”) {  
      sl_send_reply(“200”, “OK”);
      } else if(method==“MESSAGE”) {
      sl_send_reply(“202”, “Accepted”); } else {
      sl_send_reply(“403”, “Forbidden”); }
      }
      
  # SIP REDIRECT SERVER
  Un serveur de redirection est censé envoyer 3xx réponses avec les adresses alternatives dans les en-têtes Contact.
  Disons que Kamailio devrait rediriger 
  toutes les demandes SIP vers le serveur 1.2.3.4, en conservant l'extension composée  
    
      
        loadmodule “sl.so” 
        request_route {
        rewritehostport(“1.2.3.4”);
        sl_send_reply(“302”, “Moved Temporarily”); 
        
        }
        
 Lorsque le code de réponse est 3xx, le module prend les adresses dans le jeu de destination et construit les en-têtes de contact.
 L'ensemble de destination comprend l'URI de la demande et des branches supplémentaires.
La fourniture de choix multiples dans une réponse de redirection peut se faire avec   

            loadmodule “sl.so” 
            request_route {
            rewritehostport(“1.2.3.4”);
            append_branch();
            rewritehostport(“2.3.4.5”);
            sl_send_reply(“302”, “Moved Temporarily”);
            }
  
La réponse 302 contiendra deux destinations alternatives, aux adresses 1.2.3.4 et 2.3.4.5

# SIMPLE ÉQUILIBREUR DE CHARG SANS ETAT ROUND-ROBIN


La logique de routage suivante est souhaitée :
- acheminer uniquement les demandes INVITE, pour le reste envoyer 404 non trouvé
- chaque processus Kamailio doit choisir la destination parmi deux adresses IP de manière circulaire
Chaque processus Kamailio doit stocker des informations sur le dernier serveur utilisé, pour les envoyer au suivant. 
Cela peut être fait en stockant l'index dans une variable de script stockant la valeur dans la mémoire privée :

            loadmodule “sl.so” 
            loadmodule “textops.so”
            loadmodule “pv.so”
            modparam("pv", "varset", "i=i:0") 
           request_route {
            if(!is_method(“INVITE”)) { 
            sl_send_reply(“404”, “Not Found”); 
            exit;
            }
            $var(i) = ($var(i) + 1 ) mod 2; 
            if($var(i)==1) {
            rewritehostport(“1.2.3.4”);
            }
            else {
            rewritehostport(“2.3.4.5”); 
            }
            forward();
           }
           
           
          
Le module pv est chargé pour pouvoir utiliser la pseudo-variable $var(i). Le paramètre varset du module est utilisé pour initialiser $var(i) à 0 (zéro) au démarrage (qui est la valeur initiale par défaut, mais il a été ajouté ici pour avoir un exemple explicite).
En fonction de la valeur de $var(i), le premier (1.2.3.4) ou le second (2.3.4.5) serveur sera utilisé pour la redirection. À chaque transfert, la valeur de $var(i) est incrémentée et une opération modulo 2 lui est appliquée pour rester dans la plage 0 ou 1.
La valeur de $var(i) est stockée en mémoire privée, elle est donc spécifique à chaque processus Kamailio. Elle persiste également lors du traitement de nombreuses requêtes SIP, n'étant pas attachée à une requête, mais faisant partie de l'environnement d'exécution.
Cet exemple construit un équilibreur de charge dans chaque processus de demande (souvenez-vous que Kamailio est une application multi-processus). Pour une politique d'équilibrage de charge round robin au niveau de l'instance de Kamailio, l'index du serveur à utiliser doit être conservé en mémoire partagée. Comme de nombreux processus peuvent le lire et le mettre à jour, l'accès à l'index doit se faire sous mutex (verrouillage) de synchronisation. Voici comment cela peut être fait :
    
    
                  loadmodule “sl.so”
                  loadmodule “textops.so”
                  loadmodule “pv.so”
                  loadmodule “cfgutils.so” 
                  modparam("pv", "shvset", "i=i:0") 
                  modparam("cfgutils", "lock_set_size", 1) 
                  
                 request_route {
                  if(!is_method(“INVITE”)) { sl_send_reply(“404”, “Not Found”); 
                  exit;
                  }
                  lock(“balancing”);
                  $shv(i) = ($shv(i) + 1 ) mod 2; $var(x) = $shv(i); 
                  unlock(“balancing”);
                  if($var(x)==1) { 
                  rewritehostport(“1.2.3.4”);
                  } 
                  else { rewritehostport(“2.3.4.5”);
                  } 
                  forward();
                 }
                 
La variable $shv(i) est utilisée pour stocker l'index du dernier serveur utilisé, étant une variable qui stocke sa valeur dans la mémoire partagée et est accessible à toutes les preuves d'application.
Le module Cfgutils a été chargé pour les fonctions lock()/unlock() qui offrent une implémentation mutex pour le fichier de configuration, afin de protéger l'accès à $shv(i). Une copie en mémoire privée de la valeur de $shv(i) est effectuée dans la zone protégée, en la stockant dans $var(x). De cette façon, la zone de verrouillage protège l'incrémentation de l'index et le clonage de la valeur en mémoire privée, opérations qui sont très rapides. La mise à jour de l'adresse URI de la requête et la redirection peuvent être effectuées en dehors de la zone de verrouillage.
Notez que comme cette configuration ne fait pas de routage d'enregistrement, la requête dans le dialogue ne doit pas passer par notre serveur.
Si vous remplacez forward() par sl_send_reply("302", "Moved Temporarily") dans la configuration ci-dessus, vous obtenez un serveur de redirection SIP à répartition de charge.



















