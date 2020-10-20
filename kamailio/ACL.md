# Access Control Lists


L'autorisation des utilisateurs pour les services, ou les listes de contrôle d'accès, peut être mise en œuvre de plusieurs façons avec Kamailio. Il s'agit d'un mécanisme permettant de vérifier qu'un utilisateur authentifié est autorisé à utiliser divers services fournis par l'instance Kamailio, tels que les appels vers le RTPC, les numéros internationaux ou les numéros surtaxés.
Peu de mécanismes des ACL sont présentés dans ce chapitre.

### L'APPARTENANCE À UN GROUPE
Kamailio possède un module, appelé groupe, qui peut être utilisé pour vérifier si un utilisateur appartient à un groupe. C'est un concept utilisé également dans les systèmes Unix/Linux, où les privilèges d'accès peuvent être contrôlés par groupe d'utilisateurs.
Les relations entre les utilisateurs et les groupes sont conservées dans une base de données, la table "grp". L'instruction SQL pour créer la table grp est

      CREATE TABLE grp (
      id INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY NOT NULL, username VARCHAR(64) DEFAULT '' NOT NULL,
      domain VARCHAR(64) DEFAULT '' NOT NULL,
      grp VARCHAR(64) DEFAULT '' NOT NULL,
      last_modified DATETIME DEFAULT '1900-01-01 00:00:01' NOT NULL, CONSTRAINT account_group_idx UNIQUE (username, domain, grp)
      ) ENGINE=MyISAM;
    
The meaning of each column is described in the next table:

voir githube de Ncho  https://github.com/NdonDaniel/My-tuto/blob/master/kamailio/Others/sreial-test.py
