import React, { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  FileDown,
  Settings,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Trash2,
  ListChecks,
  Database,
  RefreshCw,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
  Cloud,
  CloudOff,
  Loader2,
} from "lucide-react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// --- Inicialização do Banco de Dados em Nuvem (Firebase) ---
const firebaseConfig = {
  apiKey: "AIzaSyAkCZ5E16VxgxgasTNrZx_omMrocuQS0RA",
  authDomain: "contratos---mais-escoramentos.firebaseapp.com",
  projectId: "contratos---mais-escoramentos",
  storageBucket: "contratos---mais-escoramentos.firebasestorage.app",
  messagingSenderId: "783501769667",
  appId: "1:783501769667:web:7382e6864b591b1901db76",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "mais-escoramentos";

export default function App() {
  // Estados sincronizados com a Nuvem
  const [priceKgGeral, setPriceKgGeral] = useState(
    () => localStorage.getItem("priceKgGeral") || ""
  );
  const [priceKgFormas, setPriceKgFormas] = useState(
    () => localStorage.getItem("priceKgFormas") || ""
  );
  const [companyLogo, setCompanyLogo] = useState(
    () => localStorage.getItem("companyLogo") || null
  );
  const [equipmentList, setEquipmentList] = useState([]);
  const [lastUpdate, setLastUpdate] = useState("Nunca");

  // Estados de Controle e UI (Locais)
  const [user, setUser] = useState(null);
  const [cloudStatus, setCloudStatus] = useState("connecting");
  const [contractFile, setContractFile] = useState(null);
  const [proposalFile, setProposalFile] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfReadyUrl, setPdfReadyUrl] = useState(null);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Bibliotecas
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);
  const [xlsxLoaded, setXlsxLoaded] = useState(false);

  // 1. Autenticação na Nuvem
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Erro de Autenticação", err);
        setCloudStatus("error");
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setCloudStatus("error");
    });
    return () => unsubscribe();
  }, []);

  // 2. Sincronização de Leitura (Baixa os dados ao abrir o link)
  useEffect(() => {
    if (!user) return;

    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "appConfig",
        "configData"
      );
      const unsubscribe = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.priceKgGeral !== undefined)
              setPriceKgGeral(data.priceKgGeral);
            if (data.priceKgFormas !== undefined)
              setPriceKgFormas(data.priceKgFormas);
            if (data.companyLogo !== undefined)
              setCompanyLogo(data.companyLogo);
            if (data.lastUpdate !== undefined) setLastUpdate(data.lastUpdate);
            if (data.equipmentList) setEquipmentList(data.equipmentList);
          }
          setCloudStatus("synced");
        },
        (err) => {
          console.error("Erro ao sincronizar dados", err);
          setCloudStatus("error");
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Erro na referência do banco de dados", err);
      setCloudStatus("error");
    }
  }, [user]);

  // 3. Função para Salvar na Nuvem
  const saveToCloud = async (newData) => {
    if (!user) return;
    try {
      setCloudStatus("saving");
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "appConfig",
        "configData"
      );
      await setDoc(docRef, newData, { merge: true });
      setCloudStatus("synced");
    } catch (e) {
      console.error("Erro ao salvar", e);
      setCloudStatus("error");
    }
  };

  // Salva configurações locais do usuário
  useEffect(() => {
    localStorage.setItem("equipmentList", JSON.stringify(equipmentList));
    localStorage.setItem("priceKgGeral", priceKgGeral);
    localStorage.setItem("priceKgFormas", priceKgFormas);
    if (companyLogo) localStorage.setItem("companyLogo", companyLogo);
  }, [equipmentList, priceKgGeral, priceKgFormas, companyLogo]);

  // Carrega as bibliotecas externas (PDF-Lib e SheetJS para ler XLS)
  useEffect(() => {
    const scriptPdf = document.createElement("script");
    scriptPdf.src = "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js";
    scriptPdf.async = true;
    scriptPdf.onload = () => setPdfLibLoaded(true);
    document.body.appendChild(scriptPdf);

    const scriptXlsx = document.createElement("script");
    scriptXlsx.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    scriptXlsx.async = true;
    scriptXlsx.onload = () => setXlsxLoaded(true);
    document.body.appendChild(scriptXlsx);

    return () => {
      document.body.removeChild(scriptPdf);
      document.body.removeChild(scriptXlsx);
    };
  }, []);

  const updateEquipmentList = (newList) => {
    setEquipmentList(newList);
    saveToCloud({ equipmentList: newList });
  };

  const handleEquipmentSelection = (uniqueId) => {
    updateEquipmentList(
      equipmentList.map((item) =>
        item.uniqueId === uniqueId
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  const toggleCategory = (uniqueId, e) => {
    e.stopPropagation();
    updateEquipmentList(
      equipmentList.map((item) =>
        item.uniqueId === uniqueId
          ? { ...item, category: item.category === "geral" ? "forma" : "geral" }
          : item
      )
    );
  };

  const selectAll = (select) => {
    updateEquipmentList(
      equipmentList.map((item) => ({ ...item, selected: select }))
    );
  };

  // Upload do Logo
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Por favor, selecione um arquivo de imagem (PNG, JPG, etc).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result);
        saveToCloud({ companyLogo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setCompanyLogo(null);
    saveToCloud({ companyLogo: null });
  };

  // Lógica para importar o arquivo .XLS / .XLSX
  const importBaseXLS = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!xlsxLoaded || !window.XLSX) {
      alert(
        "A biblioteca de leitura de Excel ainda está carregando. Tente novamente em alguns segundos."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = window.XLSX.read(data, { type: "array" });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const parsedList = [];
        json.forEach((row, index) => {
          const excelRow = index + 1;
          if (excelRow < 3) return;

          const id = row[0];
          const name = row[1];
          let weight = row[2];

          if (id == null || name == null || weight == null) return;

          let indG1 =
            row[5] != null ? parseFloat(String(row[5]).replace(",", ".")) : 0;
          let indG2 =
            row[6] != null ? parseFloat(String(row[6]).replace(",", ".")) : 0;
          let indG3 =
            row[7] != null ? parseFloat(String(row[7]).replace(",", ".")) : 0;

          if (typeof weight === "string")
            weight = parseFloat(weight.replace(",", "."));

          if (!isNaN(weight)) {
            const category =
              excelRow >= 70 && excelRow <= 82 ? "forma" : "geral";

            parsedList.push({
              uniqueId: `row-${excelRow}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              id: String(id).trim(),
              name: String(name).trim(),
              weight: weight,
              indG1: isNaN(indG1) ? 0 : indG1,
              indG2: isNaN(indG2) ? 0 : indG2,
              indG3: isNaN(indG3) ? 0 : indG3,
              category: category,
              selected: true,
            });
          }
        });

        if (parsedList.length > 0) {
          const dataAtual =
            new Date().toLocaleDateString("pt-BR") +
            " às " +
            new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });
          setEquipmentList(parsedList);
          setLastUpdate(dataAtual);

          saveToCloud({ equipmentList: parsedList, lastUpdate: dataAtual });

          alert(`${parsedList.length} equipamentos importados com sucesso!`);
        } else {
          alert(
            "Não foi possível ler os equipamentos. Verifique se o formato bate com a planilha padrão."
          );
        }
      } catch (err) {
        console.error(err);
        alert(
          "Erro ao processar o arquivo XLS. O arquivo pode estar corrompido ou protegido."
        );
      }
      e.target.value = null;
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e, setFile) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setFile(file);
      setError("");
    } else {
      setError("Por favor, selecione apenas arquivos PDF.");
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Trava de segurança para casas decimais com vírgula ou ponto
  const parsePriceSafe = (value) => {
    if (!value) return 0;
    return parseFloat(String(value).replace(",", ".")) || 0;
  };

  const calculateItemPrices = (item) => {
    const kgPriceRaw = item.category === "forma" ? priceKgFormas : priceKgGeral;
    const kgPrice = parsePriceSafe(kgPriceRaw);
    const precoMes = item.weight * kgPrice;
    const precoDia = precoMes / 30;
    return { precoMes, precoDia };
  };

  // Geração do PDF Final
  const generateFinalContract = async () => {
    if (!contractFile || !proposalFile) {
      setError("Por favor, anexe o Contrato base (ERP) e a Proposta Inicial.");
      return;
    }
    if (equipmentList.filter((e) => e.selected).length === 0) {
      setError("Nenhum equipamento foi selecionado na tabela.");
      return;
    }

    const pGeral = parsePriceSafe(priceKgGeral);
    const pFormas = parsePriceSafe(priceKgFormas);
    if (pGeral <= 0 && pFormas <= 0) {
      setError("Por favor, informe ao menos um valor de KG maior que zero.");
      return;
    }

    if (!pdfLibLoaded || !window.PDFLib) {
      setError("Aguarde o carregamento do sistema e tente novamente.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const finalPdf = await PDFDocument.create();
      const fontNormal = await finalPdf.embedFont(StandardFonts.Helvetica);
      const fontBold = await finalPdf.embedFont(StandardFonts.HelveticaBold);

      // 1. Processar Contrato do ERP
      const contractBytes = await contractFile.arrayBuffer();
      const contractDoc = await PDFDocument.load(contractBytes);

      // Mantém todas as páginas originais intactas
      const contractPages = await finalPdf.copyPages(
        contractDoc,
        contractDoc.getPageIndices()
      );
      contractPages.forEach((p) => finalPdf.addPage(p));

      // 2. Cabeçalho da Tabela Nova
      const drawTableHeader = (pageToDraw, startY) => {
        const { width } = pageToDraw.getSize();
        pageToDraw.drawLine({
          start: { x: 30, y: startY + 15 },
          end: { x: width - 30, y: startY + 15 },
          thickness: 1,
        });
        const fontSize = 6.5;
        pageToDraw.drawText("CÓDIGO", {
          x: 35,
          y: startY,
          size: fontSize,
          font: fontBold,
        });
        pageToDraw.drawText("EQUIPAMENTO", {
          x: 75,
          y: startY,
          size: fontSize,
          font: fontBold,
        });
        pageToDraw.drawText("PESO (KG)", {
          x: 230,
          y: startY,
          size: fontSize,
          font: fontBold,
        });
        pageToDraw.drawText("LOCAÇÃO/MÊS", {
          x: 280,
          y: startY,
          size: fontSize,
          font: fontBold,
        });
        pageToDraw.drawText("LOCAÇÃO/DIA", {
          x: 350,
          y: startY,
          size: fontSize,
          font: fontBold,
        });
        pageToDraw.drawText("INDEN. G1", {
          x: 410,
          y: startY,
          size: fontSize,
          font: fontBold,
        });
        pageToDraw.drawText("INDEN. G2", {
          x: 470,
          y: startY,
          size: fontSize,
          font: fontBold,
        });
        pageToDraw.drawText("INDEN. G3", {
          x: 530,
          y: startY,
          size: fontSize,
          font: fontBold,
        });
        pageToDraw.drawLine({
          start: { x: 30, y: startY - 10 },
          end: { x: width - 30, y: startY - 10 },
          thickness: 1,
        });
        return startY - 25;
      };

      // 3. Gerar Páginas da Tabela Nova Calculada
      let currentPage = finalPdf.addPage([595.28, 841.89]);
      let { width, height } = currentPage.getSize();

      currentPage.drawText(
        "ANEXO I CONTRATO - LISTA DE PESOS UNITÁRIOS E PREÇOS",
        {
          x: 35,
          y: height - 50,
          size: 10,
          font: fontBold,
          color: rgb(0, 0, 0),
        }
      );
      currentPage.drawText(
        `Configuração de Valores - Gerais: ${formatCurrency(
          pGeral
        )}/kg  |  Fôrmas: ${formatCurrency(pFormas)}/kg`,
        {
          x: 35,
          y: height - 65,
          size: 8,
          font: fontNormal,
          color: rgb(0.3, 0.3, 0.3),
        }
      );
      let tableY = height - 95;
      tableY = drawTableHeader(currentPage, tableY);

      const selectedEquipment = equipmentList.filter((e) => e.selected);
      for (let i = 0; i < selectedEquipment.length; i++) {
        const item = selectedEquipment[i];
        const { precoMes, precoDia } = calculateItemPrices(item);

        if (tableY < 50) {
          currentPage = finalPdf.addPage([595.28, 841.89]);
          tableY = height - 50;
          tableY = drawTableHeader(currentPage, tableY);
        }

        const fontSize = 6.5;
        currentPage.drawText(item.id, {
          x: 35,
          y: tableY,
          size: fontSize,
          font: fontNormal,
        });

        let displayName = item.name;
        if (displayName.length > 40)
          displayName = displayName.substring(0, 38) + "...";
        currentPage.drawText(displayName, {
          x: 75,
          y: tableY,
          size: fontSize,
          font: fontNormal,
        });
        currentPage.drawText(item.weight.toFixed(2).replace(".", ","), {
          x: 230,
          y: tableY,
          size: fontSize,
          font: fontNormal,
        });
        currentPage.drawText(formatCurrency(precoMes), {
          x: 280,
          y: tableY,
          size: fontSize,
          font: fontBold,
        });
        currentPage.drawText(formatCurrency(precoDia), {
          x: 350,
          y: tableY,
          size: fontSize,
          font: fontBold,
        });
        currentPage.drawText(formatCurrency(item.indG1), {
          x: 410,
          y: tableY,
          size: fontSize,
          font: fontNormal,
          color: rgb(0.2, 0.2, 0.2),
        });
        currentPage.drawText(formatCurrency(item.indG2), {
          x: 470,
          y: tableY,
          size: fontSize,
          font: fontNormal,
          color: rgb(0.2, 0.2, 0.2),
        });
        currentPage.drawText(formatCurrency(item.indG3), {
          x: 530,
          y: tableY,
          size: fontSize,
          font: fontNormal,
          color: rgb(0.2, 0.2, 0.2),
        });

        tableY -= 14;
      }

      currentPage.drawLine({
        start: { x: 30, y: tableY + 8 },
        end: { x: width - 30, y: tableY + 8 },
        thickness: 1,
      });

      // 4. Anexar Proposta
      const proposalBytes = await proposalFile.arrayBuffer();
      const proposalDoc = await PDFDocument.load(proposalBytes);
      const proposalPages = await finalPdf.copyPages(
        proposalDoc,
        proposalDoc.getPageIndices()
      );
      proposalPages.forEach((p) => finalPdf.addPage(p));

      // 5. Salvar Documento
      const pdfBytes = await finalPdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfReadyUrl(url);
    } catch (err) {
      console.error(err);
      setError(
        "Erro ao gerar PDF. Certifique-se de que os PDFs anexados não possuem senha."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const resetProcess = () => {
    setPdfReadyUrl(null);
    setContractFile(null);
    setProposalFile(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header Principal */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Logo"
                className="h-12 w-auto object-contain rounded"
              />
            ) : (
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="text-white" size={24} />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">
                Contrato Mais Escoramentos
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500 font-medium">
                  Gerador de Contratos de Locação
                </p>
                <div className="flex items-center gap-1 text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">
                  {cloudStatus === "connecting" && (
                    <span className="flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" /> Conectando
                    </span>
                  )}
                  {cloudStatus === "saving" && (
                    <span className="flex items-center gap-1">
                      <Loader2
                        size={10}
                        className="animate-spin text-blue-500"
                      />{" "}
                      Salvando...
                    </span>
                  )}
                  {cloudStatus === "synced" && (
                    <span className="flex items-center gap-1">
                      <Cloud size={10} className="text-green-500" />{" "}
                      Sincronizado
                    </span>
                  )}
                  {cloudStatus === "error" && (
                    <span className="flex items-center gap-1">
                      <CloudOff size={10} className="text-red-500" /> Offline
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition"
          >
            <Settings size={18} />
            <span className="hidden sm:inline">Configurações</span>
          </button>
        </div>
      </header>

      {/* Painel de Configurações (Modal) */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Settings size={20} className="text-blue-600" /> Configurações
                Compartilhadas
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
              {/* Seção Logo */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <ImageIcon size={16} className="text-slate-500" /> Identidade
                  Visual
                </h3>
                <div className="flex items-center gap-4">
                  {companyLogo && (
                    <div className="relative group">
                      <img
                        src={companyLogo}
                        alt="Logo Atual"
                        className="h-16 w-auto object-contain border border-slate-200 rounded p-1"
                      />
                      <button
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-sm"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Upload da Logo da Empresa
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Seção Tabela XLS */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Database size={16} className="text-slate-500" /> Banco de
                  Equipamentos
                </h3>

                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-xs text-slate-600 mb-3">
                  <div className="flex items-center gap-2 font-semibold text-slate-700 mb-1">
                    <Cloud size={14} className="text-blue-500" />
                    Tabela salva na Nuvem em: {lastUpdate}
                  </div>
                  Total de itens armazenados: {equipmentList.length}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Importar nova planilha (.XLS / .XLSX)
                  </label>
                  <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 hover:border-blue-400 transition-colors group cursor-pointer">
                    <input
                      type="file"
                      accept=".xls,.xlsx"
                      onChange={importBaseXLS}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-blue-600 transition-colors pointer-events-none">
                      <FileSpreadsheet
                        size={32}
                        className="text-slate-400 group-hover:text-blue-500"
                      />
                      <div>
                        <span className="font-semibold text-slate-700 block">
                          Clique ou arraste o Excel da Tabela
                        </span>
                        <span className="text-xs">
                          Obrigatório manter o layout padrão de colunas.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-2 border border-red-200 shadow-sm animate-in slide-in-from-top-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Coluna Esquerda: Ações */}
          <div className="xl:col-span-1 space-y-6">
            {/* Precificação */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
                <Calculator className="text-blue-500" size={18} />
                Passo 1: Valores (R$/KG)
              </h2>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Equipamentos Gerais
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-medium">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={priceKgGeral}
                      onChange={(e) => setPriceKgGeral(e.target.value)}
                      onBlur={(e) =>
                        saveToCloud({ priceKgGeral: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/30 text-slate-800 font-medium placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Fôrmas
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-medium">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={priceKgFormas}
                      onChange={(e) => setPriceKgFormas(e.target.value)}
                      onBlur={(e) =>
                        saveToCloud({ priceKgFormas: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-purple-50/30 text-slate-800 font-medium placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Anexos */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
                <FileText className="text-blue-500" size={18} />
                Passo 2: Anexos
              </h2>
              <div className="space-y-4">
                {/* UPLOAD DO ERP */}
                <div className="border border-dashed border-slate-300 bg-slate-50/50 rounded-xl p-3 text-center hover:bg-slate-50 transition relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileChange(e, setContractFile)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {!contractFile ? (
                    <div className="flex flex-col items-center gap-1 text-slate-500 py-1">
                      <span className="text-sm font-semibold text-slate-700">
                        Contrato Base (ERP)
                      </span>
                      <span className="text-xs text-red-500 font-medium">
                        Obrigatório • .PDF
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-emerald-600 py-1">
                      <CheckCircle2 size={18} />
                      <span className="text-xs font-semibold truncate w-full px-2">
                        {contractFile.name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border border-dashed border-slate-300 bg-slate-50/50 rounded-xl p-3 text-center hover:bg-slate-50 transition relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => handleFileChange(e, setProposalFile)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {!proposalFile ? (
                    <div className="flex flex-col items-center gap-1 text-slate-500 py-1">
                      <span className="text-sm font-semibold text-slate-700">
                        Proposta Inicial
                      </span>
                      <span className="text-xs text-red-500 font-medium">
                        Obrigatório • .PDF
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-emerald-600 py-1">
                      <CheckCircle2 size={18} />
                      <span className="text-xs font-semibold truncate w-full px-2">
                        {proposalFile.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botão Geração */}
            <div className="bg-slate-800 p-6 rounded-2xl shadow-lg text-center">
              {!pdfReadyUrl ? (
                <div className="space-y-4">
                  <p className="text-slate-300 text-xs mb-4">
                    Certifique-se de marcar os equipamentos ao lado antes de
                    gerar.
                  </p>
                  <button
                    onClick={generateFinalContract}
                    disabled={
                      isGenerating ||
                      !contractFile ||
                      !proposalFile ||
                      (!priceKgGeral && !priceKgFormas) ||
                      equipmentList.length === 0
                    }
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition ${
                      isGenerating ||
                      !contractFile ||
                      !proposalFile ||
                      equipmentList.length === 0
                        ? "bg-slate-600 opacity-50 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 shadow-md hover:-translate-y-0.5"
                    }`}
                  >
                    {isGenerating ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <FileDown size={20} />
                    )}
                    {isGenerating ? "GERANDO..." : "GERAR CONTRATO FINAL"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in zoom-in duration-300">
                  <div className="flex justify-center text-emerald-400 mb-2">
                    <CheckCircle2 size={48} />
                  </div>
                  <h3 className="font-bold text-white text-lg">Sucesso!</h3>
                  <div className="flex flex-col gap-2">
                    <a
                      href={pdfReadyUrl}
                      download="Contrato_Finalizado.pdf"
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-bold flex justify-center items-center gap-2 transition"
                    >
                      <FileDown size={18} /> BAIXAR PDF
                    </a>
                    <button
                      onClick={resetProcess}
                      className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition"
                    >
                      Fazer Novo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Tabela de Equipamentos */}
          <div className="xl:col-span-3 h-[calc(100vh-140px)] min-h-[600px]">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ListChecks className="text-blue-500" size={20} />
                  Lista de Equipamentos ({" "}
                  {equipmentList.filter((e) => e.selected).length} selecionados
                  )
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => selectAll(true)}
                    className="text-xs bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 px-3 py-1.5 rounded-lg font-semibold text-slate-600 transition shadow-sm"
                  >
                    Marcar Todos
                  </button>
                  <button
                    onClick={() => selectAll(false)}
                    className="text-xs bg-white border border-slate-200 hover:border-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg font-semibold text-slate-600 transition shadow-sm"
                  >
                    Desmarcar Todos
                  </button>
                </div>
              </div>

              {equipmentList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-10 bg-slate-50/50">
                  <div className="w-24 h-24 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Database size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    Nenhuma Base Encontrada
                  </h3>
                  <p className="text-slate-500 text-center max-w-md mb-6">
                    Acesse as configurações e envie a sua planilha do Excel
                    (.XLS) para alimentar o sistema.
                  </p>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2"
                  >
                    <Settings size={18} /> Configurar Base Agora
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                  <table className="w-full text-sm text-left text-slate-600 whitespace-nowrap">
                    <thead className="text-[11px] text-slate-500 uppercase bg-white sticky top-0 z-10 shadow-sm ring-1 ring-slate-100">
                      <tr>
                        <th className="px-3 py-3 w-8 text-center">Inc.</th>
                        <th className="px-3 py-3 w-16">Código</th>
                        <th className="px-3 py-3 w-64">Equipamento</th>
                        <th className="px-3 py-3 text-center">Regra</th>
                        <th className="px-3 py-3 text-right">Peso (KG)</th>
                        <th className="px-3 py-3 text-right font-bold text-blue-700">
                          Locação/Mês
                        </th>
                        <th className="px-3 py-3 text-right font-bold text-blue-700">
                          Locação/Dia
                        </th>
                        <th className="px-3 py-3 text-right text-slate-400">
                          Ind. G1
                        </th>
                        <th className="px-3 py-3 text-right text-slate-400">
                          Ind. G2
                        </th>
                        <th className="px-3 py-3 text-right text-slate-400">
                          Ind. G3
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {equipmentList.map((item) => {
                        const { precoMes, precoDia } =
                          calculateItemPrices(item);
                        const isForma = item.category === "forma";

                        return (
                          <tr
                            key={item.uniqueId}
                            className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${
                              item.selected
                                ? "bg-white"
                                : "bg-slate-50/50 opacity-60"
                            }`}
                            onClick={() =>
                              handleEquipmentSelection(item.uniqueId)
                            }
                          >
                            <td
                              className="px-3 py-2 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex justify-center items-center">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() =>
                                    handleEquipmentSelection(item.uniqueId)
                                  }
                                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2 text-slate-400 text-[11px] font-mono">
                              {item.id}
                            </td>
                            <td className="px-3 py-2">
                              <div
                                className={`font-semibold text-xs truncate max-w-[280px] ${
                                  item.selected
                                    ? "text-slate-800"
                                    : "text-slate-500"
                                }`}
                                title={item.name}
                              >
                                {item.name}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={(e) =>
                                  toggleCategory(item.uniqueId, e)
                                }
                                title="Alternar entre regra Geral e Fôrma"
                                className={`text-[9px] px-2 py-1 rounded font-bold transition hover:opacity-80 w-full flex items-center justify-center gap-1
                                  ${
                                    isForma
                                      ? "bg-purple-100 text-purple-700 border border-purple-200"
                                      : "bg-blue-100 text-blue-700 border border-blue-200"
                                  }`}
                              >
                                {isForma ? "Fôrma" : "Geral"}
                                <RefreshCw size={8} />
                              </button>
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-slate-500">
                              {item.weight.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs font-bold text-slate-800 bg-blue-50/30 tabular-nums">
                              {formatCurrency(precoMes)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-slate-600 bg-blue-50/30 tabular-nums">
                              {formatCurrency(precoDia)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-slate-400 tabular-nums">
                              {formatCurrency(item.indG1)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-slate-400 tabular-nums">
                              {formatCurrency(item.indG2)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-slate-400 tabular-nums">
                              {formatCurrency(item.indG3)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `,
        }}
      />
    </div>
  );
}
