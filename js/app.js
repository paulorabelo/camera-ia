// Captura e sanitiza o parâmetro da URL (?local=...)
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

// Atualiza o título na interface
document.getElementById("titulo-camera").textContent = LOCAL_MONITORADO;

// Identifica o contexto exato do QR Code
const ehCambuci = LOCAL_MONITORADO.toLowerCase().includes("cambuci");
const ehYpora = LOCAL_MONITORADO.toLowerCase().includes("ypor");
const ehLixeira = LOCAL_MONITORADO.toLowerCase().includes("lixeira");

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
        statusDiv.textContent = "Erro ao acessar a câmera. Verifique as permissões.";
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

        // 1. NEUTRO: Fundo ou ambiente não identificado
        if (melhorClasse.toLowerCase().includes("neutro") || melhorClasse.toLowerCase().includes("ambiente")) {
            tempoInicioDeteccao = 0;
            tempoInicioDiscrepancia = 0;
            miraBox.className = "";
            statusDiv.className = "";
            statusDiv.textContent = `👀 Monitorando Ambiente (${pct}%)`;
        }

        // -------------------------------------------------------------
        // CENÁRIO A: QR CODE DO BUEIRO CAMBUCI
        // -------------------------------------------------------------
        else if (ehCambuci) {
            // Detecção Correta: Lixo Cambuci
            if (melhorClasse === "Lixo Cambuci" && maiorProb > 0.80) {
                tempoInicioDiscrepancia = 0;
                miraBox.className = "mira-detectada";
                if (tempoInicioDeteccao === 0) tempoInicioDeteccao = agora;

                if (agora - tempoInicioDeteccao >= CONFIG.TEMPO_ESTABILIZACAO_MS) {
                    statusDiv.className = "alerta-lixo";
                    statusDiv.textContent = `🚨 LIXO NO BUEIRO CAMBUCI (${pct}%)`;
                    dispararFluxoSucesso(LOCAL_MONITORADO, "Lixo no Bueiro");
                    return;
                } else {
                    statusDiv.className = "alerta-analisando";
                    statusDiv.textContent = `Alvo Detectado: Lixo no Bueiro (${pct}%)`;
                }
            }
            // Estado Correto: Bueiro Cambuci Limpo
            else if (melhorClasse === "Bueiro Cambuci" && maiorProb > 0.78) {
                tempoInicioDeteccao = 0;
                tempoInicioDiscrepancia = 0;
                miraBox.className = "";
                statusDiv.className = "alerta-limpo";
                statusDiv.textContent = `✅ BUEIRO CAMBUCI LIMPO (${pct}%)`;
            }
            // Discrepância 1: Apontou para Bueiro Yporã
            else if ((melhorClasse.includes("Ypora") || melhorClasse.includes("Yporã")) && maiorProb > 0.80) {
                tempoInicioDeteccao = 0;
                miraBox.className = "mira-orientacao";
                statusDiv.className = "alerta-aviso";
                statusDiv.textContent = `⚠️ Detectado Bueiro Yporã neste QR Code...`;

                if (tempoInicioDiscrepancia === 0) tempoInicioDiscrepancia = agora;
                if (agora - tempoInicioDiscrepancia >= CONFIG.TEMPO_DISCREPANCIA_MS) {
                    exibirOrientacaoMascote("Olá! Sou o Robô Agente. Você abriu o código da Rua dos Cambucizeiros, mas está apontando para o Bueiro da Rua Yporã! Vamos alinhar a câmera?");
                    return;
                }
            }
            // Discrepância 2: Apontou para a Lixeira
            else if (melhorClasse.includes("Lixeira") && maiorProb > 0.80) {
                tempoInicioDeteccao = 0;
                miraBox.className = "mira-orientacao";
                statusDiv.className = "alerta-aviso";
                statusDiv.textContent = `⚠️ Lixeira detectada em ponto de Bueiro...`;

                if (tempoInicioDiscrepancia === 0) tempoInicioDiscrepancia = agora;
                if (agora - tempoInicioDiscrepancia >= CONFIG.TEMPO_DISCREPANCIA_MS) {
                    exibirOrientacaoMascote("Olá! Sou o Robô Agente. Você abriu o código do bueiro, mas está apontando para a lixeira! Vamos alinhar a câmera?");
                    return;
                }
            }
            else {
                resetTransicao(melhorClasse, pct, miraBox, statusDiv);
            }
        }

        // -------------------------------------------------------------
        // CENÁRIO B: QR CODE DO BUEIRO YPORÃ
        // -------------------------------------------------------------
        else if (ehYpora) {
            // Detecção Correta: Lixo Ypora
            if (melhorClasse === "Lixo Ypora" && maiorProb > 0.80) {
                tempoInicioDiscrepancia = 0;
                miraBox.className = "mira-detectada";
                if (tempoInicioDeteccao === 0) tempoInicioDeteccao = agora;

                if (agora - tempoInicioDeteccao >= CONFIG.TEMPO_ESTABILIZACAO_MS) {
                    statusDiv.className = "alerta-lixo";
                    statusDiv.textContent = `🚨 LIXO NO BUEIRO YPORÃ (${pct}%)`;
                    dispararFluxoSucesso(LOCAL_MONITORADO, "Lixo no Bueiro");
                    return;
                } else {
                    statusDiv.className = "alerta-analisando";
                    statusDiv.textContent = `Alvo Detectado: Lixo no Bueiro (${pct}%)`;
                }
            }
            // Estado Correto: Bueiro Yporã Limpo
            else if (melhorClasse === "Bueiro Ypora" && maiorProb > 0.78) {
                tempoInicioDeteccao = 0;
                tempoInicioDiscrepancia = 0;
                miraBox.className = "";
                statusDiv.className = "alerta-limpo";
                statusDiv.textContent = `✅ BUEIRO YPORÃ LIMPO (${pct}%)`;
            }
            // Discrepância 1: Apontou para Bueiro Cambuci
            else if (melhorClasse.includes("Cambuci") && maiorProb > 0.80) {
                tempoInicioDeteccao = 0;
                miraBox.className = "mira-orientacao";
                statusDiv.className = "alerta-aviso";
                statusDiv.textContent = `⚠️ Detectado Bueiro Cambuci neste QR Code...`;

                if (tempoInicioDiscrepancia === 0) tempoInicioDiscrepancia = agora;
                if (agora - tempoInicioDiscrepancia >= CONFIG.TEMPO_DISCREPANCIA_MS) {
                    exibirOrientacaoMascote("Olá! Sou o Robô Agente. Você abriu o código da Rua Yporã, mas está apontando para o Bueiro dos Cambucizeiros! Vamos alinhar a câmera?");
                    return;
                }
            }
            // Discrepância 2: Apontou para a Lixeira
            else if (melhorClasse.includes("Lixeira") && maiorProb > 0.80) {
                tempoInicioDeteccao = 0;
                miraBox.className = "mira-orientacao";
                statusDiv.className = "alerta-aviso";
                statusDiv.textContent = `⚠️ Lixeira detectada em ponto de Bueiro...`;

                if (tempoInicioDiscrepancia === 0) tempoInicioDiscrepancia = agora;
                if (agora - tempoInicioDiscrepancia >= CONFIG.TEMPO_DISCREPANCIA_MS) {
                    exibirOrientacaoMascote("Olá! Sou o Robô Agente. Você abriu o código do bueiro, mas está apontando para a lixeira! Vamos alinhar a câmera?");
                    return;
                }
            }
            else {
                resetTransicao(melhorClasse, pct, miraBox, statusDiv);
            }
        }

        // -------------------------------------------------------------
        // CENÁRIO C: QR CODE DA LIXEIRA DA PRAÇA
        // -------------------------------------------------------------
        else if (ehLixeira) {
            // Detecção Correta: Lixeira Cheia
            if (melhorClasse === "Lixeira Cheia" && maiorProb > 0.80) {
                tempoInicioDiscrepancia = 0;
                miraBox.className = "mira-detectada";
                if (tempoInicioDeteccao === 0) tempoInicioDeteccao = agora;

                if (agora - tempoInicioDeteccao >= CONFIG.TEMPO_ESTABILIZACAO_MS) {
                    statusDiv.className = "alerta-lixo";
                    statusDiv.textContent = `🚨 LIXEIRA CHEIA CONFIRMADA (${pct}%)`;
                    dispararFluxoSucesso(LOCAL_MONITORADO, "Lixeira Cheia");
                    return;
                } else {
                    statusDiv.className = "alerta-analisando";
                    statusDiv.textContent = `Alvo Detectado: Lixeira Cheia (${pct}%)`;
                }
            }
            // Estado Correto: Lixeira Limpa
            else if (melhorClasse === "Lixeira Limpa" && maiorProb > 0.78) {
                tempoInicioDeteccao = 0;
                tempoInicioDiscrepancia = 0;
                miraBox.className = "";
                statusDiv.className = "alerta-limpo";
                statusDiv.textContent = `✅ LIXEIRA VAZIA E LIMPA (${pct}%)`;
            }
            // Discrepância: Apontou para Bueiro Cambuci ou Bueiro Yporã
            else if ((melhorClasse.includes("Cambuci") || melhorClasse.includes("Ypora")) && maiorProb > 0.80) {
                tempoInicioDeteccao = 0;
                miraBox.className = "mira-orientacao";
                statusDiv.className = "alerta-aviso";
                statusDiv.textContent = `⚠️ Bueiro detectado em ponto de Lixeira...`;

                if (tempoInicioDiscrepancia === 0) tempoInicioDiscrepancia = agora;
                if (agora - tempoInicioDiscrepancia >= CONFIG.TEMPO_DISCREPANCIA_MS) {
                    exibirOrientacaoMascote("Olá! Sou o Robô Agente. Você abriu o código da praça, mas está apontando para um bueiro! Vamos alinhar a câmera?");
                    return;
                }
            }
            else {
                resetTransicao(melhorClasse, pct, miraBox, statusDiv);
            }
        }
    }
    requestAnimationFrame(loopPredict);
}

function resetTransicao(classe, pct, miraBox, statusDiv) {
    tempoInicioDeteccao = 0;
    tempoInicioDiscrepancia = 0;
    miraBox.className = "";
    statusDiv.className = "";
    statusDiv.textContent = `${classe} (${pct}%)`;
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

    // Trava manual por ponto
    if (ehCambuci && (classeAtual.includes("Ypora") || classeAtual.includes("Lixeira"))) {
        exibirOrientacaoMascote("Olá! Você abriu o código da Rua dos Cambucizeiros! Aponte para o bueiro desta rua.");
        return;
    }
    if (ehYpora && (classeAtual.includes("Cambuci") || classeAtual.includes("Lixeira"))) {
        exibirOrientacaoMascote("Olá! Você abriu o código da Rua Yporã! Aponte para o bueiro desta rua.");
        return;
    }
    if (ehLixeira && (classeAtual.includes("Cambuci") || classeAtual.includes("Ypora"))) {
        exibirOrientacaoMascote("Olá! Você abriu o código da praça! Aponte para a lixeira correspondente.");
        return;
    }

    const ocorrenciaEnvio = ehLixeira ? "Lixeira Cheia" : "Lixo no Bueiro";
    dispararFluxoSucesso(LOCAL_MONITORADO, ocorrenciaEnvio);
}