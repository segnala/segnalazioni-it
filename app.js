// Inizializza Supabase
const supabaseUrl = 'https://vzlmrgbffcehypauasos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bG1yZ2JmZmNlaHlwYXVhc29zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzUwMzMsImV4cCI6MjA3ODU1MTAzM30.Q2V9UXAQ-9pWoswM-_3s6aKgGc11sarxbZCuuK2IE3g';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Controlla se il browser supporta la geolocalizzazione
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      // Centra la mappa sulla posizione dell'utente
      map.setView([lat, lon], 25); // zoom più vicino
    },
    (error) => {
      console.error("Errore geolocalizzazione:", error);
      alert("Impossibile ottenere la tua posizione. La mappa resterà centrata sull'Italia.");
    }
  );
} else {
  alert("Il tuo browser non supporta la geolocalizzazione.");
}

// Config Firebase
const firebaseConfig = {
  apiKey: "LA_TUA_API_KEY",
  authDomain: "tuo-progetto.firebaseapp.com",
  projectId: "tuo-progetto",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Mappa Leaflet
const map = L.map('map').setView([41.8719, 12.5674], 6); // centro Italia
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let tipoSelezionato = null;
function setTipo(tipo) { tipoSelezionato = tipo; alert('Tipo selezionato: ' + tipo); }

// Aggiungi marker cliccando sulla mappa
map.on('click', function(e) {
  if(!tipoSelezionato) { alert("Seleziona un tipo prima!"); return; }
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;
  db.collection("segnalazioni").add({
    lat, lon,
    tipo: tipoSelezionato,
    timestamp: new Date(),
    stato: "attivo",
    conferme: 0,
    smentite: 0
  });
  tipoSelezionato = null;
});

// Carica marker in tempo reale
db.collection("segnalazioni").onSnapshot((snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
      const data = change.doc.data();
      const marker = L.marker([data.lat, data.lon]).addTo(map)
        .bindPopup(`
          <b>${data.tipo}</b><br>
          Stato: ${data.stato}<br>
          Ultimo aggiornamento: ${data.timestamp.toDate().toLocaleString()}<br>
          <button onclick="conferma('${change.doc.id}')">✅ Ancora qui</button>
          <button onclick="smentisci('${change.doc.id}')">❌ Risolto</button>
        `);
    }
  });
});

// Funzioni conferma / smentisci
function conferma(id) {
  const ref = db.collection("segnalazioni").doc(id);
  ref.update({
    conferme: firebase.firestore.FieldValue.increment(1),
    timestamp: new Date()
  });
}

function smentisci(id) {
  const ref = db.collection("segnalazioni").doc(id);
  ref.update({
    smentite: firebase.firestore.FieldValue.increment(1),
    stato: "risolto",
    timestamp: new Date()
  });
}
