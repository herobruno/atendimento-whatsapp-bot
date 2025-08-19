const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const { join } = require('path')
const fs = require('fs')
const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const QRCode = require('qrcode')

// Importando os serviços
const { handleProjetoPersonalizado } = require('./services/projetoPersonalizado')
const { handlePlanoOnDemand } = require('./services/planoOnDemand')
const { handlePlanoOpenCode } = require('./services/planoOpenCode')
const { handleBoletos } = require('./services/boletos')
const { handleIntegracoes } = require('./services/integracoes')

// Função para delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

// Função para enviar mensagem com delay
const sendMessageWithDelay = async (sock, sender, text) => {
    // Pega o estado, atualiza o timestamp e salva de volta no Map
    const userState = userStates.get(sender) || { stage: 'menu' }
    userState.lastMessageSentTimestamp = Date.now()
    userStates.set(sender, userState)

    await delay(6000) // 6 segundos de delay
    await sock.sendMessage(sender, { text })
}

const app = express()
const server = createServer(app)
const io = new Server(server)

io.on('connection', (socket) => {
    console.log('Cliente conectado via socket.io');

    socket.on('sendMessage', async ({ phoneNumber, message }) => {
        if (sock && sock.user) {
            try {
                // Sanitiza o número de telefone para remover caracteres não numéricos
                const sanitizedPhoneNumber = phoneNumber.replace(/\D/g, '');
                const jid = `${sanitizedPhoneNumber}@s.whatsapp.net`;
                
                const [result] = await sock.onWhatsApp(jid);

                if (result && result.exists) {
                    await sock.sendMessage(jid, { text: message });
                    console.log(`Mensagem enviada para ${sanitizedPhoneNumber}`);
                    socket.emit('status', `Mensagem enviada para ${sanitizedPhoneNumber}`);
                } else {
                    console.log(`O número ${sanitizedPhoneNumber} não foi encontrado no WhatsApp.`);
                    socket.emit('error', `O número ${sanitizedPhoneNumber} não foi encontrado no WhatsApp.`);
                }
            } catch (error) {
                console.error(`Erro ao enviar mensagem para ${phoneNumber}:`, error);
                socket.emit('error', `Erro ao enviar mensagem: ${error.message}`);
            }
        } else {
            console.log('Tentativa de enviar mensagem, mas o bot não está conectado.');
            socket.emit('error', 'O bot não está conectado. Por favor, escaneie o QR Code e aguarde a conexão.');
        }
    });
});

// Servir arquivos estáticos da pasta public
app.use(express.static('public'))

// Iniciar o servidor
server.listen(3000, () => {
    console.log('Servidor web rodando em http://localhost:3000')
})

let autoMessageEnabled = true; // Default to enabled

io.on('connection', (socket) => {
    console.log('Cliente conectado via socket.io');

    socket.on('sendMessage', async ({ phoneNumber, message }) => {
        if (sock && sock.user) {
            try {
                // Sanitiza o número de telefone para remover caracteres não numéricos
                const sanitizedPhoneNumber = phoneNumber.replace(/\D/g, '');
                const jid = `${sanitizedPhoneNumber}@s.whatsapp.net`;
                
                const [result] = await sock.onWhatsApp(jid);

                if (result && result.exists) {
                    await sock.sendMessage(jid, { text: message });
                    console.log(`Mensagem enviada para ${sanitizedPhoneNumber}`);
                    socket.emit('status', `Mensagem enviada para ${sanitizedPhoneNumber}`);
                } else {
                    console.log(`O número ${sanitizedPhoneNumber} não foi encontrado no WhatsApp.`);
                    socket.emit('error', `O número ${sanitizedPhoneNumber} não foi encontrado no WhatsApp.`);
                }
            } catch (error) {
                console.error(`Erro ao enviar mensagem para ${phoneNumber}:`, error);
                socket.emit('error', `Erro ao enviar mensagem: ${error.message}`);
            }
        } else {
            console.log('Tentativa de enviar mensagem, mas o bot não está conectado.');
            socket.emit('error', 'O bot não está conectado. Por favor, escaneie o QR Code e aguarde a conexão.');
        }
    });

    // Listener for the toggle switch
    socket.on('toggleAutoMessage', ({ enabled }) => {
        autoMessageEnabled = enabled;
        console.log(`Auto message feature is now ${autoMessageEnabled ? 'enabled' : 'disabled'}`);
        // Optionally, emit the current state back to the client if needed for initial load
        // socket.emit('autoMessageStatus', autoMessageEnabled);
    });
});

let sock = null
let saveState = null
let isConnecting = false
let authState = null

// Armazenar estado da conversa
const userStates = new Map()
// Armazenar mensagens do dia para cada número
const dailyMessages = new Map()

const menuPrincipal = `
👋 *Olá! Seja bem-vindo ao assistente virtual da (Logarithm).*

Digite o número correspondente ao serviço que você deseja conhecer:

1️⃣ Projeto Personalizado  
2️⃣ Plano OnDemand  
3️⃣ Plano OpenCode  
4️⃣ Boletos  
5️⃣ Integrações  
6️⃣ Falar com um Atendente Humano
`.trim()

const humano = ['atendente', 'ajuda', 'quero atendimento humano', 'humano']

async function limparAuthInfo() {
    try {
        if (fs.existsSync('./auth_info')) {
            fs.rmSync('./auth_info', { recursive: true, force: true })
        }
    } catch (error) {
        console.error('Erro ao limpar auth_info:', error)
    }
}

async function iniciarBot() {
    if (isConnecting) {
        return
    }

    try {
        isConnecting = true
        console.log('Iniciando bot...')
        
        if (fs.existsSync('./auth_info')) {
            try {
                const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
                authState = state
                saveState = saveCreds
            } catch (error) {
                await limparAuthInfo()
                const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
                authState = state
                saveState = saveCreds
            }
        } else {
            const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
            authState = state
            saveState = saveCreds
        }
        
        sock = makeWASocket({
            auth: authState,
            browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            retryRequestDelayMs: 250,
            markOnlineOnConnect: false,
            syncFullHistory: false,
            emitOwnEvents: false,
            generateHighQualityLinkPreview: false,
            getMessage: async () => {
                return { conversation: 'Olá!' }
            }
        })

        sock.ev.on('creds.update', () => {
            if (saveState) {
                saveState()
            }
        })

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update
            
            if(qr) {
                try {
                    const qrCode = await QRCode.toDataURL(qr, {
                        scale: 8,
                        margin: 1,
                        color: {
                            dark: '#000000',
                            light: '#ffffff'
                        },
                        width: 300,
                        errorCorrectionLevel: 'H'
                    })
                    io.emit('qr', qrCode)
                    io.emit('status', 'Escaneie o QR Code com seu WhatsApp')
                } catch (err) {
                    io.emit('status', 'Erro ao gerar QR Code: ' + err.message)
                }
            }
            
            if(connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut
                
                if (lastDisconnect?.error) {
                    if (statusCode === 401) {
                        await limparAuthInfo()
                        io.emit('status', 'Erro de autenticação. Por favor, escaneie o QR Code novamente.')
                        setTimeout(() => {
                            isConnecting = false
                            iniciarBot()
                        }, 3000)
                        return
                    }
                }
                
                io.emit('status', `Conexão fechada (${statusCode}), ${shouldReconnect ? 'reconectando...' : 'não reconectando'}`)
                
                if(shouldReconnect) {
                    setTimeout(() => {
                        isConnecting = false
                        iniciarBot()
                    }, 3000)
                }
            } else if(connection === 'open') {
                io.emit('status', 'Conexão estabelecida!')
                isConnecting = false
            }
        })

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0]
            if (!msg || !msg.message || msg.key.fromMe) return

            const sender = msg.key.remoteJid
            const texto = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || 
                         msg.message.imageMessage?.caption || 
                         ''

            // Obter estado atual do usuário
            let userState = userStates.get(sender) || { stage: 'menu' }

            // VERIFICAÇÃO ANTI-LOOP
            const now = Date.now()
            // Se a última mensagem foi ENVIADA (início do processo de envio) há menos de 7 segundos, ignora.
            // O delay é de 6s, então uma margem de 7s é razoável.
            if (userState.lastMessageSentTimestamp && (now - userState.lastMessageSentTimestamp < 7000)) {
                console.log(`Ignorando mensagem de ${sender} para evitar loop de bot.`)
                return
            }

            // Verificar se é uma solicitação de atendente humano
            if (humano.some(p => texto.toLowerCase().includes(p))) {
                await sendMessageWithDelay(sock, sender, '👨‍💼 Tudo bem! Encaminhando você para um de nossos atendentes...')
                return
            }

            // Processar resposta baseado no estado atual
            if (userState.stage === 'menu') {
                switch (texto) {
                    case '1':
                        userState.stage = 'projeto_personalizado_cadastro'
                        if (autoMessageEnabled) { userState = await handleProjetoPersonalizado(sock, sender, texto, userState, sendMessageWithDelay); }
                        break

                    case '2':
                        userState.stage = 'ondemand_cadastro'
                        if (autoMessageEnabled) { userState = await handlePlanoOnDemand(sock, sender, texto, userState, sendMessageWithDelay); }
                        break

                    case '3':
                        userState.stage = 'opencode_cadastro'
                        if (autoMessageEnabled) { userState = await handlePlanoOpenCode(sock, sender, texto, userState, sendMessageWithDelay); }
                        break

                    case '4':
                        userState.stage = 'boletos_cadastro'
                        if (autoMessageEnabled) { userState = await handleBoletos(sock, sender, texto, userState, sendMessageWithDelay); }
                        break

                    case '5':
                        userState.stage = 'integracoes_cadastro'
                        if (autoMessageEnabled) { userState = await handleIntegracoes(sock, sender, texto, userState, sendMessageWithDelay); }
                        break

                    case '6':
                        await sendMessageWithDelay(sock, sender, `Entendido! ✅

Vou encaminhar você para um de nossos atendentes para que possam te ajudar.

⏳ Aguarde um momento...`)
                        userState.stage = 'menu'
                        break

                    default:
                        if (autoMessageEnabled && shouldSendMenu(sender)) {
                            await sendMessageWithDelay(sock, sender, menuPrincipal)
                        }
                }
            } else {
                // Processar resposta baseado no serviço atual
                if (userState.stage.startsWith('projeto_personalizado')) {
                    userState = await handleProjetoPersonalizado(sock, sender, texto, userState, sendMessageWithDelay)
                } else if (userState.stage.startsWith('ondemand')) {
                    userState = await handlePlanoOnDemand(sock, sender, texto, userState, sendMessageWithDelay)
                } else if (userState.stage.startsWith('opencode')) {
                    userState = await handlePlanoOpenCode(sock, sender, texto, userState, sendMessageWithDelay)
                } else if (userState.stage.startsWith('boletos')) {
                    userState = await handleBoletos(sock, sender, texto, userState, sendMessageWithDelay)
                } else if (userState.stage.startsWith('integracoes')) {
                    userState = await handleIntegracoes(sock, sender, texto, userState, sendMessageWithDelay)
                }
            }

            // Salvar estado atualizado
            userStates.set(sender, userState)
        })

    } catch (error) {
        console.error('Erro ao iniciar o bot:', error)
        io.emit('status', 'Erro ao iniciar o bot: ' + error.message)
        isConnecting = false
    }
}

// Iniciar o bot
iniciarBot().catch(err => {
    console.error('Erro fatal:', err)
    io.emit('status', 'Erro fatal: ' + err.message)
    isConnecting = false
})

// Função para verificar se deve enviar o menu
const shouldSendMenu = (sender) => {
    const now = new Date()
    const today = now.toLocaleDateString()

    // Verifica se já existe mensagem para este dia
    const messages = dailyMessages.get(sender) || new Set()
    if (messages.has(today)) {
        return false
    }

    // Adiciona o dia atual ao conjunto de mensagens
    messages.add(today)
    dailyMessages.set(sender, messages)
    return true
}
