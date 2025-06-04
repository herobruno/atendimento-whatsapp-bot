# Bot WhatsApp - Assistente Virtual

Este é um bot de WhatsApp desenvolvido para automatizar o atendimento inicial de clientes, utilizando a biblioteca Baileys para conexão com a API do WhatsApp.

## 🚀 Funcionalidades

- Menu interativo com opções de serviços
- Sistema de atendimento automatizado
- Geração de QR Code para autenticação
- Interface web para visualização do QR Code
- Sistema de estados para controle de conversas
- Envio de menu apenas uma vez por dia por usuário

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- NPM (Node Package Manager)
- WhatsApp instalado no celular para escanear o QR Code

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone <URL_DO_REPOSITORIO>
cd <NOME_DO_REPOSITORIO>
```

2. Instale as dependências:
```bash
npm install
```

3. Crie a pasta `services` e adicione os seguintes arquivos:
   - `projetoPersonalizado.js`
   - `planoOnDemand.js`
   - `planoOpenCode.js`
   - `boletos.js`
   - `integracoes.js`

## 📦 Estrutura do Projeto

```
├── index.js             # Arquivo principal da aplicação
├── public/              # Arquivos estáticos
│   └── index.html       # Interface web do QR Code
├── services/            # Serviços do bot (não versionado)
│   ├── projetoPersonalizado.js
│   ├── planoOnDemand.js
│   ├── planoOpenCode.js
│   ├── boletos.js
│   └── integracoes.js
├── auth_info/          # Pasta de autenticação (não versionada)
├── package.json
└── README.md
```

## 🚀 Como Executar

1. Inicie o servidor:
```bash
node index.js
```

2. Acesse a interface web:
```
http://localhost:3000
```

3. Escaneie o QR Code com seu WhatsApp

## 📱 Funcionamento

### Menu Principal
O bot apresenta um menu com as seguintes opções:
1. Projeto Personalizado
2. Plano OnDemand
3. Plano OpenCode
4. Boletos
5. Integrações
6. Falar com um Atendente Humano

### Sistema de Estados
- O bot mantém o estado da conversa para cada usuário
- O menu principal é enviado apenas uma vez por dia por usuário
- Cada serviço possui seu próprio fluxo de conversa

### Serviços
Cada serviço (`services/*.js`) deve implementar:
- Lógica de conversa específica
- Tratamento de respostas do usuário
- Atualização do estado da conversa

## 🔒 Autenticação

- A autenticação é feita via QR Code
- Os dados de autenticação são armazenados na pasta `auth_info`
- A sessão é mantida entre reinicializações do bot

## ⚙️ Configuração

Para personalizar o bot:

1. Altere o nome da empresa no menu principal (`index.js`)
2. Modifique os fluxos de conversa nos arquivos de serviço
3. Ajuste os tempos de delay nas mensagens (padrão: 6 segundos)

## 📝 Notas Importantes

- A pasta `services` e `auth_info` não são versionadas
- O bot deve ser reiniciado após alterações no código
- Mantenha o celular conectado à internet para manter a sessão ativa


## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## ✨ Agradecimentos

- [Baileys](https://github.com/WhiskeySockets/Baileys) - Biblioteca para conexão com WhatsApp
- [Socket.IO](https://socket.io/) - Biblioteca para comunicação em tempo real
- [Express](https://expressjs.com/) - Framework web para Node.js 