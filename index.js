// --- PARTE OBRIGATÓRIA PARA O RENDER (O "Site Falso") ---
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot de Sorteio está ONLINE! 🤖');
});

// O Render define a porta automaticamente na variável process.env.PORT
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Site falso rodando na porta: ${port}`);
});
// --------------------------------------------------------

require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ApplicationCommandOptionType 
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds] // Giveaway não precisa de MessageContent
});

const sorteiosAtivos = new Map();

client.once('ready', async () => {
    console.log(`🎉 Bot de Sorteio logado como ${client.user.tag}`);

    // Registra comandos (Pode levar até 1h para aparecer globalmente)
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
    await client.application.commands.set(data);
});

client.on('interactionCreate', async interaction => {
    // --- COMANDO /SORTEIO ---
    if (interaction.isChatInputCommand() && interaction.commandName === 'sorteio') {
        const premio = interaction.options.getString('premio');
        const minutos = interaction.options.getInteger('minutos');
        const tempoMs = minutos * 60 * 1000;
        const fimDiscordFormat = Math.floor((Date.now() + tempoMs) / 1000);

        const embed = new EmbedBuilder()
            .setTitle('🎉 NOVO SORTEIO! 🎉')
            .setDescription(`**Prêmio:** ${premio}\n**Termina:** <t:${fimDiscordFormat}:R>`)
            .setColor(0xF4D03F)
            .setFooter({ text: `Hospedado por: ${interaction.user.tag}` });

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('entrar_sorteio').setLabel('Participar (0)').setStyle(ButtonStyle.Success).setEmoji('🎉')
        );

        const msg = await interaction.reply({ embeds: [embed], components: [button], fetchReply: true });

        sorteiosAtivos.set(msg.id, { participantes: new Set(), premio: premio });

        setTimeout(async () => {
            const dados = sorteiosAtivos.get(msg.id);
            if (!dados) return;

            const lista = Array.from(dados.participantes);
            let texto = "Ninguém participou. 😢";
            
            if (lista.length > 0) {
                const ganhador = lista[Math.floor(Math.random() * lista.length)];
                texto = `👑 **PARABÉNS!** <@${ganhador}> ganhou **${dados.premio}**!`;
                msg.channel.send(texto).catch(() => {});
            }

            const embedFim = new EmbedBuilder().setTitle('🎉 ENCERRADO').setDescription(texto).setColor(0xFF0000);
            const btnDisabled = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('x').setLabel(`Encerrado (${lista.length})`).setStyle(ButtonStyle.Secondary).setDisabled(true)
            );

            await msg.edit({ content: '🔔 Acabou!', embeds: [embedFim], components: [btnDisabled] }).catch(() => {});
            sorteiosAtivos.delete(msg.id);
        }, tempoMs);
    }

    // --- BOTÃO ---
    if (interaction.isButton() && interaction.customId === 'entrar_sorteio') {
        const dados = sorteiosAtivos.get(interaction.message.id);
        if (!dados) return interaction.reply({ content: 'Já acabou.', ephemeral: true });

        if (dados.participantes.has(interaction.user.id)) {
            dados.participantes.delete(interaction.user.id);
            interaction.reply({ content: 'Saiu do sorteio.', ephemeral: true });
        } else {
            dados.participantes.add(interaction.user.id);
            interaction.reply({ content: 'Entrou no sorteio!', ephemeral: true });
        }

        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('entrar_sorteio').setLabel(`Participar (${dados.participantes.size})`).setStyle(ButtonStyle.Success).setEmoji('🎉')
        );
        interaction.message.edit({ components: [btn] });
    }
});

client.login(process.env.BOT_TOKEN);
