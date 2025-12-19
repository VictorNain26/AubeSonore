import { Client, GatewayIntentBits, GuildMember, PermissionsBitField } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnection, AudioPlayer } from '@discordjs/voice';
import { EventSource } from 'eventsource';
import type { SSENowPlayingData } from '@ourmusic/shared-types';

const {
  DISCORD_BOT_TOKEN,
  AZURACAST_SSE_URL,
} = Bun.env;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

interface BotState {
  nowPlaying: SSENowPlayingData | null;
  isPlaying: boolean;
  trackElapsed: number;
  trackDuration: number;
  connection: VoiceConnection | null;
  player: AudioPlayer | null;
}

let currentState: BotState = {
  nowPlaying: null,
  isPlaying: false,
  trackElapsed: 0,
  trackDuration: 0,
  connection: null,
  player: null
};

const sseUriParams = new URLSearchParams({
  cf_connect: JSON.stringify({
    subs: { "station:ourmusic": { recover: true } }
  })
});
const sseUri = `${AZURACAST_SSE_URL}?${sseUriParams.toString()}`;

function connectSSE(): void {
  const sse = new EventSource(sseUri, { withCredentials: true });

  sse.onmessage = (e): void => {
    if (e.data.trim() === '.') return;
    let jsonData: { pub?: { data?: { np: SSENowPlayingData } } };
    try {
      jsonData = JSON.parse(e.data) as { pub?: { data?: { np: SSENowPlayingData } } };
      console.log("📌 Données brutes reçues de SSE:", JSON.stringify(jsonData, null, 2));
    } catch (err) {
      console.error("🚨 Erreur de parsing JSON SSE:", err);
      return;
    }
    if (jsonData.pub?.data?.np) {
      currentState.nowPlaying = jsonData.pub.data.np;
      currentState.trackElapsed = jsonData.pub.data.np.now_playing.elapsed;
      currentState.trackDuration = jsonData.pub.data.np.now_playing.duration;
      console.log("📌 Now Playing mis à jour:", JSON.stringify(currentState.nowPlaying, null, 2));
    }
  };

  sse.onerror = (err): void => {
    console.error("🚨 Erreur SSE:", err);
    sse.close();
    setTimeout(connectSSE, 5000);
  };
}

connectSSE();

client.on('interactionCreate', async (interaction) => {
  console.log("📌 Une interaction a été détectée !");
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  console.log(`📌 Commande reçue: ${commandName}`);

  try {
    if (commandName === 'play') {
      if (!interaction.member || !(interaction.member instanceof GuildMember) || !interaction.member.voice?.channel) {
        return interaction.reply('Vous devez être dans un salon vocal !');
      }

      if (!interaction.guild.members.me.permissions.has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) {
        return interaction.reply("Je n'ai pas les permissions nécessaires pour rejoindre et parler dans le salon vocal.");
      }

      console.log(`📌 Tentative de connexion au salon vocal: ${interaction.member.voice.channel.id}`);
      
      currentState.connection = joinVoiceChannel({
        channelId: interaction.member.voice.channel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });
      
      console.log("📌 Connexion réussie au salon vocal !");
      
      const streamUrl = currentState.nowPlaying?.station?.listen_url;
      if (!streamUrl) {
        return interaction.reply("L'URL de diffusion de la station n'est pas disponible.");
      }
      
      currentState.player = createAudioPlayer();
      const resource = createAudioResource(streamUrl, { inlineVolume: true });
      currentState.player.play(resource);
      currentState.connection.subscribe(currentState.player);

      currentState.player.on(AudioPlayerStatus.Idle, () => {
        console.log("📌 Le flux s'est arrêté, tentative de relance...");
        currentState.player.play(createAudioResource(streamUrl, { inlineVolume: true }));
      });

      currentState.isPlaying = true;
      const song = currentState.nowPlaying?.now_playing?.song;
      await interaction.reply(`Lecture en cours: **${song?.artist || 'Inconnu'} - ${song?.title || 'Inconnu'}**`);
    }

    if (commandName === 'stop') {
      if (currentState.connection) {
        currentState.player.stop();
        currentState.connection.destroy();
        currentState.connection = null;
        currentState.isPlaying = false;
        console.log("📌 Lecture arrêtée et connexion détruite.");
        await interaction.reply('Lecture arrêtée.');
      } else {
        await interaction.reply('Aucune lecture en cours.');
      }
    }

    if (commandName === 'setVolume') {
      await interaction.reply('Cette commande n\'est pas encore supportée pour Discord.');
    }

    if (commandName === 'info') {
      const song = currentState.nowPlaying?.now_playing?.song;
      await interaction.reply(
        `🎵 **Now Playing:** ${song?.artist || 'Inconnu'} - ${song?.title || 'Inconnu'}`
      );
    }
  } catch (error) {
    console.error("🚨 Erreur lors du traitement de la commande:", error);
    await interaction.reply("Une erreur est survenue lors du traitement de votre commande.");
  }
});

client.once('ready', async () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Radio en direct 🎵', type: 'LISTENING' }],
    status: 'online',
  });

  try {
    const commands = [
      { name: 'play', description: 'Joue la radio' },
      { name: 'stop', description: 'Arrête la radio' },
      { name: 'info', description: 'Affiche la musique en cours' }
    ];
    await client.application.commands.set(commands);
    console.log("📌 Commandes enregistrées avec succès !");
  } catch (error) {
    console.error("🚨 Erreur lors de l'enregistrement des commandes:", error);
  }
});

if (!DISCORD_BOT_TOKEN) {
  console.error('🚨 Aucun DISCORD_BOT_TOKEN Discord trouvé. Vérifiez votre fichier .env');
  process.exit(1);
}

console.log("📌 Tentative de connexion du bot...");
client.login(DISCORD_BOT_TOKEN).catch(error => {
  console.error("🚨 Erreur lors de la connexion du bot:", error);
  process.exit(1);
});
