require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ]
});

client.commands = new Collection();
client.ticketSettings = new Map(); // { ticketNum: { name, category, role, admin, ownership, reason, usernameNumber, welcomeMsg, welcomeImage, mentions, line, ticketLogs, closeCategory, tqeemRoom } }
client.ticketPanels = new Map();   // { messageId: { tickets: [...], type: 'buttons'|'menu' } }
client.openTickets = new Map();    // { channelId: { userId, ticketNum, guildId } }

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
const commandsData = [];
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
  commandsData.push(command.data.toJSON());
}

// Register slash commands
client.once('ready', async () => {
  console.log(`✅ Bot is online: ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commandsData });
    console.log('✅ Slash commands registered');
  } catch (e) {
    console.error(e);
  }
});

// Handle interactions
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try { await command.execute(interaction, client); }
    catch (e) { console.error(e); }
  }

  if (interaction.isButton()) {
    const { handleButton } = require('./utils/ticketHandler');
    await handleButton(interaction, client);
  }

  if (interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) {
    const { handleSelect } = require('./utils/ticketHandler');
    await handleSelect(interaction, client);
  }

  if (interaction.isModalSubmit()) {
    const { handleModal } = require('./utils/ticketHandler');
    await handleModal(interaction, client);
  }
});

client.login(process.env.TOKEN);
