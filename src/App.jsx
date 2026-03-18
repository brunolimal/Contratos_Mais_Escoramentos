import { useEffect, useState } from "react";

// Firebase
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

// CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyC95kvPPKgneoPo-kZ4zCv-2zvMsWJ3yes",
  authDomain: "contrato---mais-escoramentos.firebaseapp.com",
  projectId: "contrato---mais-escoramentos",
  storageBucket: "contrato---mais-escoramentos.firebasestorage.app",
  messagingSenderId: "453045302735",
  appId: "1:453045302735:web:f6c37252ab70cf206da3ae"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [cloudStatus, setCloudStatus] = useState("loading");
  const [items, setItems] = useState([]);
  const [novoItem, setNovoItem] = useState("");

  // 🔐 LOGIN ANÔNIMO
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Erro de Auth:", err);
        setCloudStatus("error");
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setCloudStatus("online");
        carregarDados();
      } else {
        setCloudStatus("error");
      }
    });

    return () => unsubscribe();
  }, []);

  // 📥 CARREGAR DADOS
  const carregarDados = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "dados"));
      const lista = [];
      querySnapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      setItems(lista);
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
    }
  };

  // ➕ ADICIONAR ITEM
  const adicionarItem = async () => {
    if (!novoItem) return;

    try {
      await addDoc(collection(db, "dados"), {
        nome: novoItem,
        criadoEm: new Date()
      });

      setNovoItem("");
      carregarDados();
    } catch (err) {
      console.error("Erro ao salvar:", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>📊 Sistema - Mais Escoramentos</h1>

      <p>
        Status do Firebase:{" "}
        <strong>
          {cloudStatus === "loading" && "🔄 Conectando..."}
          {cloudStatus === "online" && "🟢 Online"}
          {cloudStatus === "error" && "🔴 Erro"}
        </strong>
      </p>

      <hr />

      <h2>Adicionar Item</h2>
      <input
        type="text"
        value={novoItem}
        onChange={(e) => setNovoItem(e.target.value)}
        placeholder="Digite algo..."
      />
      <button onClick={adicionarItem}>Salvar</button>

      <hr />

      <h2>Lista</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.nome}</li>
        ))}
      </ul>
    </div>
  );
}