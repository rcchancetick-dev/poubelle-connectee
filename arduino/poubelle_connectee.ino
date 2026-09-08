/**
 * poubelle_connectee.ino
 * Firmware ESP32 - Poubelle Connectee
 * Mesure le niveau de remplissage via capteur ultrason HC-SR04 et transmet
 * la mesure au backend serverless (Vercel) via HTTP POST JSON.
 * Le backend calcule le niveau et declenche, si besoin, une alerte SMS via
 * l'API BEFIANA (voir api/_befiana.js dans le depot).
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* SSID_WIFI          = "NOM_DU_RESEAU_WIFI";
const char* MOT_DE_PASSE_WIFI  = "MOT_DE_PASSE_WIFI";

const char* URL_SERVEUR = "https://votre-projet.vercel.app/api/enregistrer-niveau";
const char* CLE_API      = "change_moi_en_production";
const int ID_POUBELLE     = 1;

const int PIN_TRIG   = 5;
const int PIN_ECHO   = 18;
const int PIN_LED    = 2;
const int PIN_BUZZER = 4;

const float VITESSE_SON_CM_US = 0.0343;
const unsigned long INTERVALLE_MESURE_MS = 30000;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  connecterWiFi();
}

void loop() {
  float distance = mesurerDistanceMoyenne();

  if (distance > 0) {
    Serial.print("Distance mesuree : ");
    Serial.print(distance);
    Serial.println(" cm");
    envoyerMesureAuServeur(distance);
  } else {
    Serial.println("Mesure invalide, capteur non repondant.");
  }

  delay(INTERVALLE_MESURE_MS);
}

void connecterWiFi() {
  Serial.print("Connexion au Wi-Fi");
  WiFi.begin(SSID_WIFI, MOT_DE_PASSE_WIFI);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnecte ! Adresse IP : " + WiFi.localIP().toString());
}

float mesurerDistance() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  long dureeEcho = pulseIn(PIN_ECHO, HIGH, 30000);
  if (dureeEcho == 0) return -1;

  return (dureeEcho * VITESSE_SON_CM_US) / 2.0;
}

float mesurerDistanceMoyenne() {
  float somme = 0;
  int nbValides = 0;

  for (int i = 0; i < 5; i++) {
    float d = mesurerDistance();
    if (d > 0 && d < 400) {
      somme += d;
      nbValides++;
    }
    delay(60);
  }

  if (nbValides == 0) return -1;
  return somme / nbValides;
}

void activerAlerteLocale(bool actif) {
  digitalWrite(PIN_LED, actif ? HIGH : LOW);
  digitalWrite(PIN_BUZZER, actif ? HIGH : LOW);
}

void envoyerMesureAuServeur(float distanceCm) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi deconnecte, tentative de reconnexion...");
    connecterWiFi();
    return;
  }

  HTTPClient http;
  http.begin(URL_SERVEUR);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", CLE_API);

  StaticJsonDocument<128> doc;
  doc["poubelle_id"] = ID_POUBELLE;
  doc["distance_cm"] = distanceCm;

  String corpsJson;
  serializeJson(doc, corpsJson);

  int codeReponse = http.POST(corpsJson);

  if (codeReponse > 0) {
    String reponse = http.getString();
    Serial.println("Reponse serveur (" + String(codeReponse) + ") : " + reponse);

    bool alerteDeclenchee = reponse.indexOf("\"alerte\":true") != -1;
    activerAlerteLocale(alerteDeclenchee);
  } else {
    Serial.println("Erreur d'envoi HTTP : " + String(codeReponse));
  }

  http.end();
}
