// Captura e sanitiza o local via URL (?local=...)
const urlParams = new URLSearchParams(window.location.search);
const localBruto = urlParams.get('local') || CONFIG.LOCAL_PADRAO;

const LOCAL_MONITORADO = CONFIG.LOCAIS_PERMITIDOS.includes(localBruto)
    ? localBruto
    : CONFIG.LOCAL_PADRAO;

let model, videoElement;
let classeAtual = "";
let sistemaBloqueado = false;

let tempoInicioDeteccao = 0;
let tempoInicioDiscrepancia = 0;

// Atualiza cabeçalho de forma segura
document.getElementById("titulo-camera").textContent = LOCAL_MONITORADO;

// Identifica o contexto do QR Code escaneado
const ehLocalBueiro = LOCAL_MONITORADO.toLowerCase().includes("bueiro");
const ehLocalLixeira = LOCAL_MONITORADO.toLowerCase().includes("lixeira");

async function iniciarSistema() {
    const btn = document.getElementById("btn-start");
    const statusDiv = document.getElementById("status");
    videoElement = document.getElementById("webcam");

    btn.style.display = "none";
    statusDiv.textContent = "Solicitando permissão da câmera...";

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false
        });

        videoElement.srcObject = stream;
        await videoElement.play();

        statusDiv.textContent = "Carregando inteligência artificial...";
        const modelURL = CONFIG.URL_MODELO + "model.json";
        const metadataURL = CONFIG.URL_MODELO + "metadata.json";

        model = await tmImage.load(modelURL, metadataURL);
        statusDiv.textContent = "IA Pronta. Aponte para o ponto urbano...";
        document.getElementById("btn-dispatch").style.display = "block";

        loopPredict();
    } catch (err) {
        console.error(err);
        statusDiv.textContent = "Erro ao acessar a câmera: Verifique as permissões.";
        btn.style.display = "block";
        btn.textContent = "TENTAR NOVAMENTE";
    }
}

async function loopPredict() {
    if (sistemaBloqueado) return;

    if (model && videoElement && videoElement.readyState === 4) {
        const prediction = await model.predict(videoElement);
        let maiorProb = 0;
        let melhorClasse = "";

        for (let i = 0; i < prediction.length; i++) {
            if (prediction[i].probability > maiorProb) {
                maiorProb = prediction[i].probability;
                melhorClasse = prediction[i].className;
            }
        }

        classeAtual = melhorClasse;
        const pct = (maiorProb * 100).toFixed(0);
        const statusDiv = document.getElementById("status");
        const miraBox = document.getElementById("mira-box");
        const agora = Date.now();

        // 1. CLASSE NEUTRA: Ambiente estável
        if (melhorClasse.toLowerCase().includes("neutro") || melhorClasse.toLowerCase().includes("ambiente")) {
            tempoInicioDeteccao = 0;
            tempoInicioDiscrepancia = 0;
            miraBox.className = "";
            statusDiv.className = "";
            statusDiv.textContent = `👀 Monitorando Ambiente (${pct}%)`;
        }

        // 2. OPÇÃO 3 - MASCOTE ORIENTADOR: QR Code de Bueiro, mas câmera apontada para Lixeira
        else if (ehLocalBueiro && melhorClasse.includes("Lixeira") && maiorProb > 0.80) {
            tempoInicioDeteccao = 0;
            miraBox.className = "mira-orientacao";
            statusDiv.className = "alerta-aviso";
            statusDiv.textContent = `⚠️ Lixeira detectada em ponto de Bueiro...`;

            if (tempoInicioDiscrepancia === 0) tempoInicioDiscrepancia = agora;
            if (agora - tempoInicioDiscrepancia >= CONFIG.TEMPO_DISCREPANCIA_MS) {
                exibirOrientacaoMascote("Olá! Sou o Robô Agente. Você abriu o código do bueiro, mas está apontando para a lixeira! Vamos tentar alinhar a câmera?");
                return;
            }
        }

        // 3. OPÇÃO 3 - MASCOTE ORIENTADOR: QR Code de Lixeira, mas câmera apontada para Bueiro
        else if (ehLocalLixeira && melhorClasse.includes("Bueiro") && maiorProb > 0.80) {
            tempoInicioDeteccao = 0;
            miraBox.className = "mira-orientacao";
            statusDiv.className = "alerta-aviso";
            statusDiv.textContent = `⚠️ Bueiro detectado em ponto de Lixeira...`;

            if (tempoInicioDiscrepancia === 0) tempoInicioDiscrepancia = agora;
            if (agora - tempoInicioDiscrepancia >= CONFIG.TEMPO_DISCREPANCIA_MS) {
                exibirOrientacaoMascote("Olá! Sou o Robô Agente. Você abriu o código da praça, mas está apontando para um bueiro! Vamos tentar alinhar a câmera?");
                return;
            }
        }

        // 4. DETECÇÃO VÁLIDA: Lixeira Cheia no ponto correto
        else if (melhorClasse === "Lixeira Cheia" && maiorProb > 0.80) {
            tempoInicioDiscrepancia = 0;
            miraBox.className = "mira-detectada";
            if (tempoInicioDeteccao === 0) tempoInicioDeteccao = agora;
            let decorrido = agora - tempoInicioDeteccao;

            if (decorrido >= CONFIG.TEMPO_ESTABILIZACAO_MS) {
                statusDiv.className = "alerta-lixo";
                statusDiv.textContent = `🚨 LIXEIRA CHEIA CONFIRMADA (${pct}%)`;
                dispararFluxoSucesso(LOCAL_MONITORADO, "Lixeira Cheia");
                return;
            } else {
                statusDiv.className = "alerta-analisando";
                statusDiv.textContent = `Alvo Detectado: Lixeira Cheia (${pct}%)`;
            }
        }

        // 5. DETECÇÃO VÁLIDA: Lixo no Bueiro no ponto correto
        else if (melhorClasse === "Lixo no Bueiro" && maiorProb > 0.80) {
            tempoInicioDiscrepancia = 0;
            miraBox.className = "mira-detectada";
            if (tempoInicioDeteccao === 0) tempoInicioDeteccao = agora;
            let decorrido = agora - tempoInicioDeteccao;

            if (decorrido >= CONFIG.TEMPO_ESTABILIZACAO_MS) {
                statusDiv.className = "alerta-lixo";
                statusDiv.textContent = `🚨 LIXO NO BUEIRO CONFIRMADO (${pct}%)`;
                dispararFluxoSucesso(LOCAL_MONITORADO, "Lixo no Bueiro");
                return;
            } else {
                statusDiv.className = "alerta-analisando";
                statusDiv.textContent = `Alvo Detectado: Lixo no Bueiro (${pct}%)`;
            }
        }

        // 6. ESTADOS LIMPOS REGULARES
        else if (melhorClasse.toLowerCase().includes("limp") && maiorProb > 0.78) {
            tempoInicioDeteccao = 0;
            tempoInicioDiscrepancia = 0;
            miraBox.className = "";
            statusDiv.className = "alerta-limpo";
            statusDiv.textContent = melhorClasse.includes("Lixeira")
                ? `✅ LIXEIRA VAZIA E LIMPA (${pct}%)`
                : `✅ BUEIRO LIMPO (${pct}%)`;
        }

        // 7. OUTROS ESTADOS DE TRANSIÇÃO
        else {
            tempoInicioDeteccao = 0;
            tempoInicioDiscrepancia = 0;
            miraBox.className = "";
            statusDiv.className = "";
            statusDiv.textContent = `${melhorClasse} (${pct}%)`;
        }
    }
    requestAnimationFrame(loopPredict);
}

async function enviarParaCentral(local, ocorrencia) {
    try {
        await fetch(CONFIG.WEBHOOK_APPS_SCRIPT, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: CONFIG.TOKEN_SEGURANCA,
                local: local,
                ocorrencia: ocorrencia
            })
        });
    } catch (err) {
        console.error("Erro no envio:", err);
    }
}

function dispararFluxoSucesso(local, ocorrencia) {
    sistemaBloqueado = true;
    enviarParaCentral(local, ocorrencia);

    document.getElementById("video-container").style.display = "none";
    document.getElementById("status").style.display = "none";
    document.getElementById("btn-dispatch").style.display = "none";
    document.getElementById("tela-orientacao").style.display = "none";

    const telaSucesso = document.getElementById("tela-sucesso");
    telaSucesso.style.display = "flex";

    const contadorEl = document.getElementById("contador-segundos");
    const btnReiniciar = document.getElementById("btn-nova-inspecao");
    btnReiniciar.style.display = "none";

    let restantes = 7;
    contadorEl.textContent = `Próxima leitura liberada em ${restantes}s...`;

    const intervalo = setInterval(() => {
        restantes--;
        if (restantes > 0) {
            contadorEl.textContent = `Próxima leitura liberada em ${restantes}s...`;
        } else {
            clearInterval(intervalo);
            contadorEl.textContent = "Inspeção concluída com sucesso!";
            btnReiniciar.style.display = "block";
        }
    }, 1000);
}

// Função da Opção 3: Chama o Mascote Orientador na tela
function exibirOrientacaoMascote(mensagem) {
    sistemaBloqueado = true;

    document.getElementById("video-container").style.display = "none";
    document.getElementById("status").style.display = "none";
    document.getElementById("btn-dispatch").style.display = "none";
    document.getElementById("tela-sucesso").style.display = "none";

    document.getElementById("texto-orientacao").textContent = `"${mensagem}"`;
    document.getElementById("tela-orientacao").style.display = "flex";
}

function reiniciarInspecao() {
    tempoInicioDeteccao = 0;
    tempoInicioDiscrepancia = 0;
    sistemaBloqueado = false;

    document.getElementById("tela-sucesso").style.display = "none";
    document.getElementById("tela-orientacao").style.display = "none";
    document.getElementById("video-container").style.display = "flex";
    document.getElementById("status").style.display = "block";
    document.getElementById("status").className = "";
    document.getElementById("status").textContent = "IA Pronta. Aponte para o ponto urbano...";
    document.getElementById("btn-dispatch").style.display = "block";

    loopPredict();
}

function dispararAlertaManual() {
    if (!classeAtual || classeAtual.toLowerCase().includes("neutro")) {
        alert("Aponte a câmera para o bueiro ou lixeira antes de enviar!");
        return;
    }

    // Se clicar manualmente apontando para o objeto trocado, o Mascote Orientador também entra em ação!
    if (ehLocalBueiro && classeAtual.includes("Lixeira")) {
        exibirOrientacaoMascote("Olá! Sou o Robô Agente. Você abriu o código do bueiro, mas está apontando para a lixeira! Vamos tentar alinhar a câmera?");
        return;
    }
    if (ehLocalLixeira && classeAtual.includes("Bueiro")) {
        exibirOrientacaoMascote("Olá! Sou o Robô Agente. Você abriu o código da praça, mas está apontando para um bueiro! Vamos tentar alinhar a câmera?");
        return;
    }

    const ocorrenciaEnvio = (classeAtual === "Lixeira Cheia" || ehLocalLixeira)
        ? "Lixeira Cheia"
        : "Lixo no Bueiro";

    dispararFluxoSucesso(LOCAL_MONITORADO, ocorrenciaEnvio);
}