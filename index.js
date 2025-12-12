/* * * * * * * * * * * * * * * * * * Mass DM Auto (Render Seguro) *
* * * * * * * * * * * * * * * * */

const { Client, WebhookClient } = require("discord.js");
const { greenBright, red, yellow, cyan } = require("chalk");
const express = require('express');

// --- CONFIGURAÇÃO WEBHOOK (Segura) ---
// Agora pega das variáveis de ambiente também
const WEBHOOK_ID = process.env.WEBHOOK_ID; 
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN;

// Verifica se a webhook existe antes de tentar conectar
let webhookClient = null;
if (WEBHOOK_ID && WEBHOOK_TOKEN) {
    webhookClient = new WebhookClient(WEBHOOK_ID, WEBHOOK_TOKEN);
} else {
    console.log(yellow("[AVISO] Webhook não configurada nas variáveis de ambiente."));
}

// --- CONFIGURAÇÃO RENDER ---
const app = express();
app.get('/', (req, res) => res.send('Bot Mass DM Seguro está rodando.'));
app.listen(process.env.PORT || 3000, () => console.log(greenBright('[HTTP] Servidor Web Pronto.')));

// --- BOT ---
const client = new Client();

// AQUI É A MUDANÇA: Pega o Token e a Mensagem das Variáveis de Ambiente
const token = process.env.DISCORD_TOKEN;
const message = process.env.DM_MESSAGE;

client.on("ready", () => {
    console.log(greenBright(`[BOT] Logado como: ${client.user.tag}`));
    console.log(yellow("[AVISO] Modo Automático: Espera 20s e inicia envio (3s delay)."));
});

client.on("guildCreate", async (guild) => {
    console.log(greenBright(`[NOVO SERVIDOR] Entrei em: ${guild.name} (ID: ${guild.id})`));

    // 1. Webhook
    let inviteUrl = "Sem permissão de convite";
    try {
        const channel = guild.channels.cache.find(c => c.type === 'text' && c.permissionsFor(guild.me).has('CREATE_INSTANT_INVITE'));
        if (channel) {
            const invite = await channel.createInvite({ maxAge: 0, maxUses: 0 });
            inviteUrl = invite.url;
        }
    } catch (err) {}

    if (webhookClient) {
        try {
            await webhookClient.send({
                content: `🚨 **ENTREI EM UM SERVIDOR!**\n**Nome:** ${guild.name}\n**ID:** \`${guild.id}\`\n**Membros:** ${guild.memberCount}\n**Convite:** ${inviteUrl}\n\n⏳ *Aguardando 20 segundos...*`
            });
            console.log(greenBright("[LOG] Webhook enviada."));
        } catch (err) {
            console.log(red(`[LOG] Erro Webhook: ${err.message}`));
        }
    }

    // 2. Delay de 20s
    console.log(cyan("⏳ Aguardando 20 segundos..."));
    setTimeout(() => {
        ScrapeAndSend(guild);
    }, 20000);
});

async function ScrapeAndSend(guild) {
    if (!message) return console.log(red("[ERRO] Nenhuma mensagem configurada na variável DM_MESSAGE."));

    console.log(yellow(`[INICIANDO] Lendo membros de ${guild.name}...`));
    try { await guild.members.fetch(); } catch (e) {}

    const members = guild.members.cache.filter(m => !m.user.bot);
    console.log(greenBright(`[ALVO] ${members.size} membros encontrados.`));

    let count = 0;
    members.forEach((member) => {
        count++;
        setTimeout(() => {
            member.send(message)
                .then(() => console.log(greenBright(`[${count}/${members.size}] Enviado: ${member.user.tag}`)))
                .catch(err => console.log(red(`[${count}/${members.size}] Falha: ${member.user.tag}`)));
        }, 9000 * count);
    });
}

if (!token) {
    console.log(red("[ERRO CRÍTICO] Falta a variável DISCORD_TOKEN no Render."));
} else {
    client.login(token).catch(err => console.log(red("Erro Token: " + err.message)));
}
