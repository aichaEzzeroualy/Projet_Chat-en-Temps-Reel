# Projet_Chat-en-Temps-Reel
Une application de messagerie instantanée utilisant WebSockets, permettant aux utilisateurs de discuter en temps réel via une interface simple et intuitive.

🎯 Fonctionnalités
Inscription et authentification des utilisateurs

Gestion des amis (ajout/suppression)

Messagerie en temps réel

Historique des conversations

Interface responsive (adaptée à tous les écrans)

🛠️ Technologies Utilisées
Frontend : HTML, CSS, JavaScript

Backend : Node.js avec WebSockets (ws)

Stockage des données : Fichiers texte pour les utilisateurs et l’historique

🚀 Installation & Lancement
Cloner le dépôt :

bash
Copier
Modifier
git clone https://github.com/abdjaliltoumi4/Futur_Dev-Chat-en-temps-reel
cd Chat_Application
Installer les dépendances :

bash
Copier
Modifier
npm install
Lancer le serveur :

bash
Copier
Modifier
node Server.mjs
Accéder à l'application via le navigateur :

arduino
Copier
Modifier
http://localhost:8080
🧭 Mode d’emploi
🔐 Inscription & Connexion
Ouvrir l’application dans un navigateur

Cliquer sur "S'inscrire" si vous n'avez pas encore de compte

Saisir votre nom d'utilisateur, email et mot de passe

Se connecter ensuite avec vos identifiants

👥 Gestion des Amis
Ajouter un ami :

Entrer l’adresse email de l’ami

Cliquer sur le bouton "+"

L’ami apparaît dans la liste une fois accepté

Supprimer un ami :

Survoler le nom de l’ami

Cliquer sur "×" puis confirmer

💬 Messagerie
Sélectionner un ami

Saisir le message dans le champ en bas

Appuyer sur "Entrée" ou cliquer sur "Envoyer"

Les messages sont reçus en temps réel si l'ami est connecté

🚪 Déconnexion
Cliquer sur le bouton de déconnexion en haut à droite

Vous serez redirigé vers la page de connexion

🧩 Détails de l’Implémentation Serveur
Le fichier Server.mjs gère :

L’authentification des utilisateurs

Les connexions WebSocket

La gestion des amis

La transmission des messages

Le stockage des messages (en mémoire vive)

Format de stockage dans users.txt :

css
Copier
Modifier
nom_utilisateur,email,mot_de_passe,[liste_amis]
💻 Détails de l’Implémentation Client
Le code client gère :

L’affichage de l’interface utilisateur

La communication WebSocket avec le serveur

L’affichage des messages et des amis

Les actions utilisateur (envoyer/supprimer message, ajouter/supprimer amis)

⚠️ Limitations Connues
L’historique des messages est temporaire (non conservé après redémarrage serveur)

Pas de chiffrement des messages

Seuls les messages texte sont pris en charge

Pas de système de messages hors-ligne

📈 Améliorations Futures
Historique persistant via base de données

Chiffrement de bout en bout

Envoi de fichiers et médias

Indicateurs de message vu/envoyé

Ajout des groupes de discussion

Profils utilisateurs avec avatars

🧠 Description Détaillée du Fonctionnement
1. Initialisation
Le code démarre au chargement de la page

L’utilisateur connecté est récupéré via sessionStorage

Une connexion WebSocket est ouverte à ws://localhost:8080

2. Fonctionnalités Clés
a) Gestion des Amis
Ajouter : entrer email → cliquer sur "Ajouter" → notification

Supprimer : cliquer sur la croix → confirmer → notification

b) Messagerie
Envoyer : sélectionner un ami → taper → envoyer → notification

Recevoir : message affiché + notification sonore/visuelle

Supprimer : cliquer sur l’icône poubelle → confirmer

3. Fonctionnement Technique
a) Connexion
Reconnexion automatique jusqu’à 5 essais

Mise à jour de la liste d’amis toutes les 30 secondes

b) Stockage
Messages : localement, 100 derniers par discussion

Utilisateur : temporaire (effacé à la fermeture du navigateur)

c) Notifications
📩 Vert : message reçu

📤 Bleu : message envoyé

✅ Vert : succès

❌ Rouge : erreur

Durée : 3 secondes, avec animation

4. Interface Utilisateur
a) Éléments Visuels
Avatars : cercles avec initiales et couleur aléatoire

Messages :

Droite → messages envoyés (bleu clair)

Gauche → messages reçus (vert clair + avatar)

Popups : pour confirmation d’action

b) Zones Principales
En-tête : nom utilisateur + bouton déconnexion

Colonne gauche : liste d’amis avec actions

Centre : zone de chat + historique

Bas : champ de message + bouton envoyer

5. Bonnes Pratiques
Toujours vérifier qu’un ami est sélectionné avant d’envoyer

Vider le champ après envoi

Limiter stockage local

Donner un retour visuel à chaque action

6. Problèmes Fréquents
Pas de connexion ? Vérifier que le serveur tourne bien

Messages dupliqués ? Bug courant en dev, corrigé

Notifications multiples ? Elles s’effacent automatiquement après 3s

🔧 Étapes de Développement
🥇 Étape 1 : Initialisation du projet
→ Création du dossier, npm init, installation de express, socket.io
→ Fichiers de base HTML/CSS/JS

🥈 Étape 2 : Serveur WebSocket
→ Gérer les connexions, émission/réception de messages

🥉 Étape 3 : Authentification
→ Interface d’inscription, connexion, validation côté serveur

🏅 Étape 4 : Interface
→ Création des composants, gestion des événements UI

🏅 Étape 5 : Historique et notifications
→ Sauvegarde des messages côté serveur, ajout de feedback visuel

🏅 Étape 6 : Suppression/édition de messages
→ Gestion des permissions, ajout d’avatars, effets d’interface

📚 Technologies
Backend : Node.js + Express + WebSocket ou Socket.io

Frontend : HTML, CSS, JavaScript 