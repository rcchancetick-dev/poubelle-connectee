/**
 * poubelle_connectee.ino
 * Firmware ESP32 - Poubelle Connectee
 *
 * Mesure le niveau de remplissage via capteur ultrason HC-SR04 et transmet
 * la mesure au backend serverless (Vercel) via HTTP POST JSON. Le backend
 * calcule le niveau et declenche, si besoin, une alerte SMS via l'API
 * BEFIANA (voir api/_befiana.js dans le depot).
 *
 * NOUVEAU : l'intervalle entre deux mesures (deep sleep) n'est plus fige
 * dans ce fichier. Il est desormais lu dans la reponse JSON renvoyee par
 * le serveur ("intervalleSommeil", en secondes), lui-meme configurable
 * depuis l'espace admin du site (section "Intervalle de mesure ESP32").
 * Cela permet de changer la frequence de mesure a distance, sans jamais
 * reflasher le module -- seul le PREMIER cycle utilise la valeur par
 * defaut codee ici (INTERVALLE_SOMMEIL_DEFAUT_S), tant que l'ESP32 n'a
 * pas encore recu de reponse valide du serveur.
 *
 * IMPORTANT : n'oubliez pas de reprendre vos propres valeurs deja
 * configurees (SSID_WIFI, MOT_DE_PASSE_WIFI, URL_SERVEUR, CLE_API)
 * avant de televerser cette version sur votre ESP32.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// =============================================================================
// 1. CONFIGURATION WI-FI
// -----------------------------------------------------------------------------
// Ces deux valeurs sont OBLIGATOIREMENT codees en dur : l'ESP32 en a besoin
// avant meme de pouvoir contacter le serveur, donc impossible de les piloter
// a distance (contrairement a l'intervalle de sommeil, voir plus bas).
// =============================================================================
const char* SSID_WIFI          = "CT Link";       // <-- reprenez votre valeur actuelle
const char* MOT_DE_PASSE_WIFI  = "Fa ainw bk";        // <-- reprenez votre valeur actuelle

// =============================================================================
// 2. CONFIGURATION SERVEUR
// -----------------------------------------------------------------------------
// URL_SERVEUR et CLE_API sont egalement fixes en dur, pour la meme raison :
// il faut savoir OU envoyer la requete et comment s'authentifier avant
// meme le tout premier contact avec l'API.
// =============================================================================
const char* URL_SERVEUR = "https://poubelle-connecte.vercel.app/api/enregistrer-niveau"; // <-- reprenez votre URL actuelle
const char* CLE_API      = "hzgdjfyrtqgaofjdgetsjeyfnxbflgyt";                              // <-- doit correspondre a ESP32_API_KEY sur Vercel
const int ID_POUBELLE     = 1; // identifiant de la poubelle cote backend (1, 2 ou 3 par defaut)

// =============================================================================
// 3. BROCHES (PINS) UTILISEES SUR L'ESP32
// =============================================================================
const int PIN_TRIG   = 5;   // GPIO 5  -> TRIG du HC-SR04
const int PIN_ECHO   = 18;  // GPIO 18 -> ECHO du HC-SR04 (via pont diviseur 5V -> 3.3V, R1=2k/R2=1k)
const int PIN_LED    = 2;   // GPIO 2  -> LED d'alerte locale (+ resistance 220 ohm)
const int PIN_BUZZER = 4;   // GPIO 4  -> Buzzer actif d'alerte locale

// =============================================================================
// 4. PARAMETRES DE MESURE (comptage de tentatives laisse fixe dans le code,
//    comme demande -- pas de pilotage a distance pour ce parametre-la)
// =============================================================================
const float VITESSE_SON_CM_US = 0.0343;    // vitesse du son dans l'air (cm/microseconde)
const int NB_TENTATIVES_MESURE = 5;         // nombre de lectures moyennees par cycle

// =============================================================================
// 5. INTERVALLE DE SOMMEIL (DEEP SLEEP) -- DESORMAIS PILOTABLE A DISTANCE
// -----------------------------------------------------------------------------
// INTERVALLE_SOMMEIL_DEFAUT_S sert de valeur de secours : utilisee au tout
// premier demarrage du module (avant tout contact reussi avec le serveur),
// ou si jamais une reponse serveur ne contient pas le champ attendu.
// Des que le serveur repond normalement, sa valeur "intervalleSommeil"
// prend le relais et est sauvegardee en memoire RTC pour le prochain cycle.
// =============================================================================
const uint64_t INTERVALLE_SOMMEIL_DEFAUT_S = 300; // 5 minutes, valeur de secours uniquement
const uint64_t INTERVALLE_SOMMEIL_MIN_S    = 30;  // meme garde-fou minimum que cote serveur (securite)
const uint64_t MICROSECONDES_PAR_SECONDE   = 1000000ULL;

// -----------------------------------------------------------------------------
// Memoire RTC : contrairement a la RAM normale, ces variables survivent au
// deep sleep. Elles permettent de retenir, d'un cycle a l'autre, la derniere
// valeur d'intervalle recue du serveur et le nombre total de cycles effectues
// depuis la derniere coupure d'alimentation complete (utile pour le diagnostic).
// -----------------------------------------------------------------------------
RTC_DATA_ATTR uint64_t intervalleSommeilActuelS = INTERVALLE_SOMMEIL_DEFAUT_S;
RTC_DATA_ATTR int compteurCycles = 0;

// =============================================================================
// SETUP() : execute a chaque demarrage ET a chaque reveil apres deep sleep
// (le deep sleep provoque un reset complet du chip, on repart donc toujours
// d'ici, jamais de loop() -- voir la fonction loop() a la fin du fichier).
// =============================================================================
void setup() {
  Serial.begin(115200);
  delay(200); // laisse le temps au moniteur serie de se synchroniser au reveil

  compteurCycles++;
  Serial.println("\n===== Cycle automatique n. " + String(compteurCycles) + " =====");
  afficherCauseReveil();
  Serial.println("Intervalle de sommeil actuel : " + String(intervalleSommeilActuelS) + " s");

  // Initialisation des broches a chaque reveil (l'etat des GPIO n'est pas
  // garanti conserve pendant le deep sleep selon les broches utilisees).
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  // --- Etape 1 : mesure de la distance (moyenne sur NB_TENTATIVES_MESURE) ---
  float distance = mesurerDistanceMoyenne();

  if (distance > 0) {
    Serial.println("Distance mesuree : " + String(distance) + " cm");

    // --- Etape 2 : connexion Wi-Fi puis envoi de la mesure au serveur ---
    if (connecterWiFi()) {
      envoyerMesureAuServeur(distance);
      WiFi.disconnect(true); // coupe proprement le Wi-Fi avant le deep sleep
    } else {
      Serial.println("Mesure non envoyee (Wi-Fi indisponible ce cycle).");
      // On garde l'ancien intervalleSommeilActuelS : pas de nouvelle valeur
      // recue du serveur ce cycle-ci, donc pas de raison de le changer.
    }
  } else {
    Serial.println("Mesure invalide (capteur non repondant), cycle ignore.");
  }

  // --- Etape 3 : retour en sommeil profond jusqu'au prochain cycle ---
  entrerEnSommeilAutomatique();
  // Le code ne revient JAMAIS ici : le deep sleep provoque un reset complet
  // et l'execution repart directement de setup() au reveil suivant.
}

// =============================================================================
// LOOP() : jamais atteinte en fonctionnement normal (voir explication dans
// setup()). Laissee vide par convention du framework Arduino.
// =============================================================================
void loop() {
  // Volontairement vide.
}

/**
 * Affiche dans le moniteur serie la cause du reveil actuel : utile pour
 * distinguer un cycle automatique normal (minuteur) d'un premier demarrage
 * ou d'une coupure d'alimentation (reset manuel, batterie rechargee, etc.).
 */
void afficherCauseReveil() {
  esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
  switch (cause) {
    case ESP_SLEEP_WAKEUP_TIMER:
      Serial.println("Cause du reveil : minuteur (cycle automatique normal).");
      break;
    case ESP_SLEEP_WAKEUP_UNDEFINED:
    default:
      Serial.println("Cause du reveil : premier demarrage / reset manuel / coupure alimentation.");
      break;
  }
}

/**
 * Effectue une seule mesure brute de distance avec le capteur HC-SR04.
 * Retourne -1 si aucun echo n'est recu (capteur deconnecte ou hors de portee).
 */
float mesurerDistance() {
  // Impulsion ultrasonique de 10 microsecondes sur la broche TRIG
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  // Mesure de la duree de l'echo (timeout 30 ms = environ 5 m de portee max)
  long dureeEcho = pulseIn(PIN_ECHO, HIGH, 30000);
  if (dureeEcho == 0) return -1;

  // Distance = (duree x vitesse du son) / 2 (aller-retour de l'onde)
  return (dureeEcho * VITESSE_SON_CM_US) / 2.0;
}

/**
 * Effectue NB_TENTATIVES_MESURE lectures successives et retourne leur
 * moyenne, en ignorant les valeurs aberrantes (hors plage 0-400 cm, limite
 * physique du HC-SR04). Ce filtrage reste toujours cote firmware : c'est
 * la seule maniere de traiter le bruit du capteur au plus pres du materiel,
 * avant meme l'envoi reseau (comme demande, ce comptage n'est PAS pilotable
 * depuis le site).
 */
float mesurerDistanceMoyenne() {
  float somme = 0;
  int nbValides = 0;

  for (int i = 0; i < NB_TENTATIVES_MESURE; i++) {
    float d = mesurerDistance();
    if (d > 0 && d < 400) {
      somme += d;
      nbValides++;
    }
    delay(60); // court delai entre deux impulsions pour eviter les interferences
  }

  if (nbValides == 0) return -1;
  return somme / nbValides;
}

/**
 * Allume ou eteint la LED et le buzzer d'alerte locale, en complement du
 * SMS envoye par le serveur si le seuil de la poubelle est depasse.
 */
void activerAlerteLocale(bool actif) {
  digitalWrite(PIN_LED, actif ? HIGH : LOW);
  digitalWrite(PIN_BUZZER, actif ? HIGH : LOW);
}

/**
 * Tente de connecter l'ESP32 au reseau Wi-Fi configure, avec un timeout de
 * 10 secondes maximum (20 tentatives x 500 ms) pour ne pas bloquer
 * indefiniment le cycle si le reseau est indisponible.
 */
bool connecterWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID_WIFI, MOT_DE_PASSE_WIFI);
  Serial.print("Connexion au Wi-Fi");

  int tentatives = 0;
  const int MAX_TENTATIVES = 20;
  while (WiFi.status() != WL_CONNECTED && tentatives < MAX_TENTATIVES) {
    delay(500);
    Serial.print(".");
    tentatives++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnecte ! Adresse IP : " + WiFi.localIP().toString());
    return true;
  }

  Serial.println("\nEchec de connexion Wi-Fi (timeout).");
  return false;
}

/**
 * Construit le JSON attendu par l'API ({ poubelle_id, distance_cm }) et
 * l'envoie en HTTP POST, avec la cle API en en-tete x-api-key.
 *
 * A la reception de la reponse :
 *   - lit le champ "alerte" pour piloter la LED/buzzer locale ;
 *   - lit le champ "intervalleSommeil" (NOUVEAU) pour mettre a jour la duree
 *     du prochain deep sleep, configurable a distance depuis l'espace admin.
 */
void envoyerMesureAuServeur(float distanceCm) {
  HTTPClient http;
  http.begin(URL_SERVEUR);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", CLE_API);

  // Construction du corps JSON avec ArduinoJson (plus fiable qu'une
  // concatenation manuelle de String pour un objet a plusieurs champs)
  StaticJsonDocument<128> requeteJson;
  requeteJson["poubelle_id"] = ID_POUBELLE;
  requeteJson["distance_cm"] = distanceCm;

  String corpsRequete;
  serializeJson(requeteJson, corpsRequete);

  Serial.println("Envoi des donnees : " + corpsRequete);
  int codeReponse = http.POST(corpsRequete);

  if (codeReponse > 0) {
    String reponseBrute = http.getString();
    Serial.println("Reponse serveur (" + String(codeReponse) + ") : " + reponseBrute);

    if (codeReponse == 401 || codeReponse == 403) {
      Serial.println("ATTENTION : cle API refusee. Verifiez que CLE_API "
                      "correspond exactement a ESP32_API_KEY cote serveur.");
    } else {
      // Analyse de la reponse JSON pour en extraire "alerte" et "intervalleSommeil"
      StaticJsonDocument<256> reponseJson;
      DeserializationError erreurParsing = deserializeJson(reponseJson, reponseBrute);

      if (!erreurParsing) {
        // --- Gestion de l'alerte locale (LED/buzzer) ---
        bool alerteDeclenchee = reponseJson["alerte"] | false; // false si champ absent
        activerAlerteLocale(alerteDeclenchee);
        Serial.println(alerteDeclenchee
          ? "Seuil depasse : LED/buzzer d'alerte actives (SMS egalement declenche cote serveur)."
          : "Niveau sous le seuil : alerte locale eteinte.");

        // --- Mise a jour de l'intervalle de sommeil pilote a distance ---
        // "| INTERVALLE_SOMMEIL_DEFAUT_S" fournit une valeur de repli si le
        // champ est absent de la reponse (ancienne version de l'API, etc.)
        uint64_t nouvelIntervalle = reponseJson["intervalleSommeil"] | INTERVALLE_SOMMEIL_DEFAUT_S;

        // Garde-fou local : on n'accepte jamais un intervalle en dessous du
        // minimum de securite, meme si une valeur incorrecte etait renvoyee.
        if (nouvelIntervalle < INTERVALLE_SOMMEIL_MIN_S) {
          Serial.println("Intervalle recu invalide (" + String(nouvelIntervalle) +
                          " s), conservation de la valeur precedente.");
        } else if (nouvelIntervalle != intervalleSommeilActuelS) {
          Serial.println("Intervalle de sommeil mis a jour depuis le site : " +
                          String(intervalleSommeilActuelS) + " s -> " + String(nouvelIntervalle) + " s");
          intervalleSommeilActuelS = nouvelIntervalle;
        } else {
          Serial.println("Intervalle de sommeil inchange : " + String(intervalleSommeilActuelS) + " s");
        }
      } else {
        Serial.println("Erreur de lecture du JSON de reponse, intervalle de sommeil conserve.");
      }
    }
  } else {
    Serial.println("Erreur d'envoi HTTP, code : " + String(codeReponse));
    // Pas de reponse exploitable : on garde le dernier intervalle connu.
  }

  http.end();
}

/**
 * Place l'ESP32 en deep sleep pour intervalleSommeilActuelS secondes, avec
 * reveil automatique par le minuteur RTC interne (independant du reste de
 * la puce, donc fiable meme processeur principal totalement eteint).
 * Aucune intervention manuelle n'est necessaire : le cycle se repete
 * indefiniment tout seul, a la frequence configuree depuis le site.
 */
void entrerEnSommeilAutomatique() {
  Serial.println("Mise en veille profonde pour " + String(intervalleSommeilActuelS) + " secondes...");
  Serial.flush(); // s'assure que tous les messages serie sont bien envoyes avant l'extinction
  esp_sleep_enable_timer_wakeup(intervalleSommeilActuelS * MICROSECONDES_PAR_SECONDE);
  esp_deep_sleep_start();
}
