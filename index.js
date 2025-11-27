 // --- KEEP ALIVE (Finge que é um site para ficar 24h) ---
const express = require('express');
const app = express();
app.get("/", (req, res) => {
  const ping = new Date();
  ping.setHours(ping.getHours() - 3);
  console.log(`Ping recebido às ${ping.getUTCHours()}:${ping.getUTCMinutes()}:${ping.getUTCSeconds()}`);
  res.sendStatus(200);
});
app.listen(process.env.PORT || 3000); 
// -------------------------------------------------------

require('dotenv').config();
const { Client, ...restante do código } = require('discord.js');
// ... o resto do seu código continua normal abaixo

require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ComponentType, ApplicationCommandOptionType 
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Mapa para guardar os participantes de cada sorteio temporariamente
const sorteiosAtivos = new Map();

client.once('ready', async () => {
    console.log(`🎉 Bot de Sorteio logado como ${client.user.tag}`);

    // Registra o comando globalmente (pode demorar 1h para aparecer)
    // Para aparecer na hora, use o método de Guilda que ensinei antes
    const data = [
        {
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
                    description: 'Duração em minutos (ex: 10)',
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                }
            ]
        }
    ];

    await client.application.commands.set(data);
    console.log('Comando /sorteio registrado!');
});

client.on('interactionCreate', async interaction => {
    
    // --- COMANDO /SORTEIO ---
    if (interaction.isChatInputCommand() && interaction.commandName === 'sorteio') {
        const premio = interaction.options.getString('premio');
        const minutos = interaction.options.getInteger('minutos');
        
        // Calcula o tempo do fim (Unix Timestamp)
        const tempoMs = minutos * 60 * 1000;
        const fimTimestamp = Date.now() + tempoMs;
        const fimDiscordFormat = Math.floor(fimTimestamp / 1000); // Discord usa segundos

        const embed = new EmbedBuilder()
            .setTitle('🎉 NOVO SORTEIO! 🎉')
            .setDescription(`**Prêmio:** ${premio}\n**Duração:** ${minutos} minutos\n\nTermina: <t:${fimDiscordFormat}:R>`) // <t:X:R> cria o contador visual
            .setColor(0xF4D03F) // Dourado
            .setFooter({ text: `Hospedado por: ${interaction.user.tag}` });

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('entrar_sorteio')
                .setLabel('Participar (0)')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎉')
        );

        const msg = await interaction.reply({ embeds: [embed], components: [button], fetchReply: true });

        // Salva o sorteio na memória
        sorteiosAtivos.set(msg.id, {
            participantes: new Set(), // Set evita duplicatas (o mesmo user clicar 2x)
            premio: premio,
            dono: interaction.user.id
        });

        // CRIA O TEMPORIZADOR PARA ACABAR
        setTimeout(async () => {
            // Recarrega os dados (pois participantes entraram)
            const dados = sorteiosAtivos.get(msg.id);
            if (!dados) return; // Sorteio já foi apagado ou deu erro

            const listaParticipantes = Array.from(dados.participantes);
            
            let resultadoTexto = "";
            let cor = 0xFF0000; // Vermelho se ninguém ganhar

            if (listaParticipantes.length === 0) {
                resultadoTexto = "Sorteio cancelado. Ninguém participou. 😢";
            } else {
                // Sorteia um índice aleatório
                const ganhadorId = listaParticipantes[Math.floor(Math.random() * listaParticipantes.length)];
                resultadoTexto = `👑 **PARABÉNS!** O ganhador do prêmio **${dados.premio}** foi: <@${ganhadorId}>!`;
                cor = 0x00FF00; // Verde
            }

            const embedFim = new EmbedBuilder()
                .setTitle('🎉 SORTEIO ENCERRADO')
                .setDescription(resultadoTexto)
                .setColor(cor)
                .setFooter({ text: `Prêmio: ${dados.premio}` });

            // Desativa o botão
            const btnDisabled = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('entrar_sorteio')
                    .setLabel(`Encerrado (${listaParticipantes.length})`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

            try {
                await msg.edit({ content: '🔔 O sorteio acabou!', embeds: [embedFim], components: [btnDisabled] });
                // Marca o ganhador no chat para ele ver
                if (listaParticipantes.length > 0) msg.channel.send(resultadoTexto);
            } catch (e) { console.log("Erro ao finalizar sorteio (msg deletada?)"); }

            sorteiosAtivos.delete(msg.id); // Limpa memória

        }, tempoMs);
    }

    // --- BOTÃO DE PARTICIPAR ---
    if (interaction.isButton() && interaction.customId === 'entrar_sorteio') {
        const dados = sorteiosAtivos.get(interaction.message.id);
        
        if (!dados) {
            return interaction.reply({ content: '❌ Este sorteio já acabou.', ephemeral: true });
        }

        if (dados.participantes.has(interaction.user.id)) {
            // Se já está participando, remove (Opcional: ou só avisa)
            dados.participantes.delete(interaction.user.id);
            await interaction.reply({ content: '❌ Você saiu do sorteio.', ephemeral: true });
        } else {
            // Adiciona
            dados.participantes.add(interaction.user.id);
            await interaction.reply({ content: '✅ Você está participando! Boa sorte.', ephemeral: true });
        }

        // Atualiza o contador no botão
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
