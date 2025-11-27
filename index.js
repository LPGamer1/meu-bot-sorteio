// --- 1. CONFIGURAÇÃO DO SITE FALSO (PARA O RENDER NÃO DESLIGAR) ---
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  const ping = new Date();
  ping.setHours(ping.getHours() - 3);
  console.log(`Ping recebido às ${ping.getUTCHours()}:${ping.getUTCMinutes()}`);
  res.send('Bot de Sorteio está ONLINE! 🤖');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Site falso rodando na porta: ${port}`);
});

// --- 2. CÓDIGO DO BOT DISCORD ---
require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ApplicationCommandOptionType 
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const sorteiosAtivos = new Map();

client.once('ready', async () => {
    console.log(`🎉 Bot de Sorteio logado como ${client.user.tag}`);

    const data = [{
        name: 'sorteio',
        description: 'Inicia um novo sorteio',
        options: [
            {
                name: 'premio',
                description: 'O que será sorteado?',
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: 'minutos',
                description: 'Duração em minutos',
                type: ApplicationCommandOptionType.Integer,
                required: true,
            }
        ]
    }];

    // REGISTRO DE COMANDO
    const guildId = process.env.MAIN_GUILD;
    if (guildId) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            await guild.commands.set(data);
            console.log(`✅ Comando /sorteio registrado no servidor: ${guild.name}`);
        } else {
            console.log(`❌ ERRO: ID da guilda não encontrado.`);
        }
    } else {
        await client.application.commands.set(data);
        console.log("⚠️ Registrando globalmente (lento).");
    }
});

client.on('interactionCreate', async interaction => {
    
    // --- LÓGICA DO COMANDO /SORTEIO ---
    if (interaction.isChatInputCommand() && interaction.commandName === 'sorteio') {
        const premio = interaction.options.getString('premio');
        const minutos = interaction.options.getInteger('minutos');
        
        // A SOMA DO TEMPO (Agora + Minutos)
        const tempoMs = minutos * 60 * 1000;
        const fimTimestamp = Math.floor((Date.now() + tempoMs) / 1000);

        const embed = new EmbedBuilder()
            .setTitle('🎉 NOVO SORTEIO! 🎉')
            // AQUI ESTÁ A MUDANÇA: Usei <t:${fimTimestamp}:t> para mostrar o horário (ex: 16:30)
            .setDescription(`**Prêmio:** ${premio}\n**Duração:** ${minutos} minutos\n**Termina às:** <t:${fimTimestamp}:t>`)
            .setColor(0xF4D03F)
            .setFooter({ text: `Patrocinado por: ${interaction.user.username}` });

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('entrar_sorteio')
                .setLabel('Participar (0)')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎉')
        );

        const msg = await interaction.reply({ embeds: [embed], components: [button], fetchReply: true });

        sorteiosAtivos.set(msg.id, {
            participantes: new Set(),
            premio: premio
        });

        // Temporizador
        setTimeout(async () => {
            const dados = sorteiosAtivos.get(msg.id);
            if (!dados) return;

            const lista = Array.from(dados.participantes);
            let textoFinal = "Sorteio cancelado. Ninguém participou. 😢";
            let corFinal = 0xFF0000;

            if (lista.length > 0) {
                const ganhador = lista[Math.floor(Math.random() * lista.length)];
                textoFinal = `👑 **PARABÉNS!** <@${ganhador}> ganhou **${dados.premio}**!`;
                corFinal = 0x00FF00;
                msg.channel.send(textoFinal).catch(() => {});
            }

            const embedFim = new EmbedBuilder()
                .setTitle('🎉 SORTEIO ENCERRADO')
                .setDescription(textoFinal)
                .setColor(corFinal);

            const btnDisabled = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('entrar_sorteio')
                    .setLabel(`Encerrado (${lista.length})`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

            await msg.edit({ content: '🔔 O tempo acabou!', embeds: [embedFim], components: [btnDisabled] }).catch(() => {});
            sorteiosAtivos.delete(msg.id);

        }, tempoMs);
    }

    // --- LÓGICA DO BOTÃO ---
    if (interaction.isButton() && interaction.customId === 'entrar_sorteio') {
        const dados = sorteiosAtivos.get(interaction.message.id);
        if (!dados) return interaction.reply({ content: '❌ Já acabou.', ephemeral: true });

        if (dados.participantes.has(interaction.user.id)) {
            dados.participantes.delete(interaction.user.id);
            await interaction.reply({ content: '❌ Saiu do sorteio.', ephemeral: true });
        } else {
            dados.participantes.add(interaction.user.id);
            await interaction.reply({ content: '✅ Entrou no sorteio!', ephemeral: true });
        }

        const btnAtualizado = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('entrar_sorteio')
                .setLabel(`Participar (${dados.participantes.size})`)
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎉')
        );

        await interaction.message.edit({ components: [btnAtualizado] });
    }
});

client.login(process.env.BOT_TOKEN);
