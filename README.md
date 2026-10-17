# 🏙️ COI Kids - Saneamento Inteligente
> Plataforma integrada de monitoramento urbano com Visão Computacional na borda (Edge AI), despacho operacional 24h e painel tático em tempo real para Cidades Inteligentes.

![Status](https://img.shields.io/badge/Status-Homologado%20para%20a%20Feira-22c55e?style=for-the-badge) ![Edge AI](https://img.shields.io/badge/IA-TensorFlow.js%20%7C%20Teachable%20Machine-38bdf8?style=for-the-badge) ![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-161f30?style=for-the-badge&logo=github) ![Backend](https://img.shields.io/badge/Backend-Google%20Apps%20Script-f59e0b?style=for-the-badge&logo=google) ![Mobile](https://img.shields.io/badge/Equipe%20de%20Campo-AppSheet-8b5cf6?style=for-the-badge)

---
## 📌 Visão Geral da Solução

O **COI Kids** simula a infraestrutura de um Centro de Operações Integradas municipal, permitindo que a própria comunidade atue na identificação e combate ao descarte irregular de resíduos em bueiros e lixeiras urbanas.

A solução opera em três camadas coordenadas:
1. **Inspeção Inteligente (Cidadão / Câmera):** Reconhecimento de imagem via IA rodando diretamente no celular do munícipe.
2. **Sala de Situação (Telão Central):** Painel analítico com telemetria ao vivo, gráficos de dispersão e cálculo de eficiência do saneamento.
3. **Despacho Operacional (AppSheet 24h):** Aplicativo móvel para equipes de campo com triagem automática de fila ativa e confirmação de desobstrução.
---
## 🛠️ Stack Tecnológica & Ferramentas

| Camada                   | Tecnologia                              | Papel no Projeto                                                        |
| :----------------------- | :-------------------------------------- | :---------------------------------------------------------------------- |
| **Visão Computacional**  | TensorFlow.js + Teachable Machine       | Classificação em tempo real de classes urbanas no próprio navegador     |
| **Frontend de Inspeção** | HTML5, CSS3 Moderno, JavaScript Vanilla | Interface tática com mascote vetorizado (`robo.svg`) e mira inteligente |
| **Hospedagem Web**       | GitHub Pages                            | Distribuição estática dos recursos com protocolo HTTPS forçado          |
| **Microsserviço / API**  | Google Apps Script (`doPost` / `doGet`) | Roteamento seguro, validação de token e sincronização de dados          |
| **Banco de Dados**       | Google Sheets                           | Registro histórico de ocorrências e base analítica                      |
| **Fila Operacional**     | Google AppSheet                         | Gestão de chamados em campo via Slices dinâmicos (`Chamados_Ativos`)    |

---
## 🏗️ Arquitetura do Sistema

```text
       [ Cidadão / Visitante ]
                  │ (Escaneia QR Code por ponto urbano)
                  ▼
   [ Câmera Inteligente - GitHub Pages ]
      ├── Inferência Local (TensorFlow.js)
      └── Mascote Orientador (Validação Cruzada)
                  │ 
                  │  POST (JSON + Token de Autenticação)
                  ▼
     [ API Google Apps Script ]
      ├── Validação de Whitelist (Locais e Ocorrências)
      └── Persistência Segura
                  │
                  ▼
       [ Planilha Central / Google Sheets ]
             /                        \
            ▼                          ▼
 [ AppSheet: Equipe de Campo ]    [ Telão: Sala de Situação ]
  - Triagem de Fila Ativa          - KPIs de Eficiência Dinâmica
  - Status: Limpeza concluída      - Auto-refresh de Alertas em Tempo Real
```

## 🔒 Segurança e Privacidade de Dados (_Privacy by Design_)

- **Processamento na Borda (_Edge Computing_):** Nenhuma imagem capturada pela câmera é transmitida ou armazenada em servidores externos. A inferência da rede neural ocorre exclusivamente na memória RAM/GPU local do smartphone do visitante.
- **Autenticação por Token Tático:** As transmissões para a API central exigem chave de integridade (`COI-KIDS-2026`) para bloquear requisições não autorizadas.
- **Whitelist Estrita de Entidades:** O backend rejeita parâmetros fora da lista oficial de pontos (`Rua dos Cambucizeiros`, `Rua Yporã`, `Praça Arandu`).
   
## 📸 Galeria do Estande (Feira de Ciências 2026)

> _Registros fotográficos da apresentação pública, interação dos visitantes com a maquete e operação ao vivo do COI Kids._

| **Maquete & Infraestrutura Urbana**             | **Visitantes Operando a Câmera IA**             |
| ----------------------------------------------- | ----------------------------------------------- |
|                                                 |                                                 |
| _Detalhamento dos pontos de bueiros e lixeiras_ | _Detecção em tempo real nos celulares dos pais_ |

| **Sala de Situação no Telão Central**            | **Equipe de Alunos Guardiões**                  |
| ------------------------------------------------ | ----------------------------------------------- |
|                                                  |                                                 |
| _Métricas de eficiência e alertas em tempo real_ | _Estudantes conduzindo o atendimento municipal_ |
## 🚀 Como Executar o Projeto Localmente

1. Clone o Repositório:

```bash
git clone [https://github.com/paulorabelo/camera-ia.git](https://github.com/paulorabelo/camera-ia.git)
```

2. Navegue até a pasta da aplicação:

```bash
cd camera-ia
```

3. Abra o arquivo 'index.html' em um servidor local seguro (ex.: Live Server do VS Code) para testar os fluxo da câmera e da rede neural.
