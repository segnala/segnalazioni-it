// ==========================
// CONFIGURAZIONE SUPABASE
// ==========================
const supabaseUrl = 'https://vzlmrgbffcehypauasos.supabase.co'; // sostituisci se cambi progetto
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bG1yZ2JmZmNlaHlwYXVhc29zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzUwMzMsImV4cCI6MjA3ODU1MTAzM30.Q2V9UXAQ-9pWoswM-_3s6aKgGc11sarxbZCuuK2IE3g'; // la tua chiave anon
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================
// MAPPA LEAFLET
// ==========================
const map = L.map('map').setView([41.8719, 12.5674], 6); // Italia centrale
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Centrare sulla posizione dell'utente
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(pos => {
    map.setView([pos.coords.latitude, pos.coords.longitude], 14);
  });
}

// ==========================
// GESTIONE TIPO SEGNALAZIONE
// ==========================
let tipoSelezionato = null;
function setTipo(tipo) {
  tipoSelezionato = tipo;
  alert('Tipo selezionato: ' + tipo);
}

// ==========================
// AGGIUNGI SEGNALAZIONE
// ==========================
async function aggiungiSegnalazione(lat, lon, tipo) {
  const { data, error } = await supabase
    .from('segnalazioni')
    .insert([{ lat, lon, tipo, stato: 'attivo', conferme: 0, smentite: 0 }]);

  if (error) console.error('Errore inserimento:', error);
  else {
    console.log('Segnalazione aggiunta:', data);
    caricaSegnalazioni(); // Aggiorna mappa subito
  }
}

// Click sulla mappa
map.on('click', function (e) {
  if (!tipoSelezionato) {
    alert('Seleziona prima un tipo di segnalazione!');
    return;
  }
  aggiungiSegnalazione(e.latlng.lat, e.latlng.lng, tipoSelezionato);
  tipoSelezionato = null; // reset tipo
});

// ==========================
// CARICA TUTTE LE SEGNALAZIONI
// ==========================
async function caricaSegnalazioni() {
  // Prima rimuovi tutti i marker per evitare duplicati
  if (window.markerGroup) map.removeLayer(window.markerGroup);
  window.markerGroup = L.layerGroup().addTo(map);

  const { data, error } = await supabase.from('segnalazioni').select('*');
  if (error) {
    console.error('Errore caricamento:', error);
    return;
  }

  data.forEach(item => {
    const marker = L.marker([item.lat, item.lon]).addTo(window.markerGroup);
    marker.bindPopup(`
      <b>${item.tipo}</b><br>
      Stato: ${item.stato}<br>
      Ultimo aggiornamento: ${item.timestamp ? new Date(item.timestamp).toLocaleString() : '-'}<br>
      <button onclick="conferma('${item.id}')">✅ Ancora qui</button>
      <button onclick="smentisci('${item.id}')">❌ Risolto</button>
    `);
  });
}

// Carica segnalazioni all'avvio
caricaSegnalazioni();

// ==========================
// FUNZIONI CONFERMA / SMENTISCI
// ==========================
async function conferma(id) {
  const { data } = await supabase.from('segnalazioni').select('conferme').eq('id', id).single();
  const nuoveConferme = (data?.conferme || 0) + 1;

  const { error } = await supabase
    .from('segnalazioni')
    .update({ conferme: nuoveConferme, timestamp: new Date().toISOString() })
    .eq('id', id);

  if (error) console.error('Errore conferma:', error);
  else {
    console.log('✅ Conferma aggiornata');
    caricaSegnalazioni(); // aggiorna mappa
  }
}

async function smentisci(id) {
  const { data } = await supabase.from('segnalazioni').select('smentite').eq('id', id).single();
  const nuoveSmentite = (data?.smentite || 0) + 1;

  const { error } = await supabase
    .from('segnalazioni')
    .update({ smentite: nuoveSmentite, stato: 'risolto', timestamp: new Date().toISOString() })
    .eq('id', id);

  if (error) console.error('Errore smentita:', error);
  else {
    console.log('🚫 Smentita aggiornata');
    caricaSegnalazioni(); // aggiorna mappa
  }
}

// ==========================
// TEST CONNESSIONE SUPABASE
// ==========================
(async () => {
  const { data, error } = await supabase.from('segnalazioni').select('*');
  if (error) {
    console.error('❌ Errore nel collegamento a Supabase:', error);
  } else {
    console.log('✅ Connessione riuscita! Dati:', data);
  }
})();
