const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder, AuditLogEvent } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ]
});

const TOKEN = 'YOUR_BOT_TOKEN_HERE';
const LOG_CHANNEL_NAME = 'karan-logs'; // Create this channel in your server

// ── Anti-spam tracker ──────────────────────────────────────────────────────
const messageCount = new Map(); // userId -> { count, timestamp }
const SPAM_THRESHOLD = 5;       // messages
const SPAM_WINDOW_MS = 4000;    // within 4 seconds

// ── Banned words list ──────────────────────────────────────────────────────
const BANNED_WORDS = ['badword1', 'badword2']; // Add your own

// ── Helper: send to log channel ────────────────────────────────────────────
async function sendLog(guild, embed) {
  const logChannel = guild.channels.cache.find(c => c.name === LOG_CHANNEL_NAME);
  if (logChannel) logChannel.send({ embeds: [embed] });
}

// ══════════════════════════════════════════════════════════════════════════
//  READY
// ══════════════════════════════════════════════════════════════════════════
client.once('ready', () => {
  console.log(`✅ Karan Bot is online as ${client.user.tag}`);
  client.user.setActivity('Protecting Karan Server 🛡️');
});

// ══════════════════════════════════════════════════════════════════════════
//  ANTI-SPAM  (auto-mute after threshold)
// ══════════════════════════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const now = Date.now();
  const entry = messageCount.get(userId) || { count: 0, timestamp: now };

  if (now - entry.timestamp > SPAM_WINDOW_MS) {
    entry.count = 1;
    entry.timestamp = now;
  } else {
    entry.count++;
  }
  messageCount.set(userId, entry);

  if (entry.count >= SPAM_THRESHOLD) {
    try {
      await message.member.timeout(5 * 60 * 1000, 'Auto-muted: Spamming');
      const embed = new EmbedBuilder()
        .setTitle('🔇 Anti-Spam Triggered')
        .setColor(0xff4444)
        .addFields(
          { name: 'User', value: `${message.author.tag} (${userId})` },
          { name: 'Reason', value: 'Sending too many messages too quickly' },
          { name: 'Duration', value: '5 minutes' }
        )
        .setTimestamp();
      await sendLog(message.guild, embed);
      message.channel.send(`⚠️ ${message.author}, you've been muted for 5 minutes due to spamming.`);
    } catch (e) { console.error('Mute failed:', e.message); }
    messageCount.delete(userId);
    return;
  }

  // ── Banned word filter ─────────────────────────────────────────────────
  const content = message.content.toLowerCase();
  if (BANNED_WORDS.some(w => content.includes(w))) {
    try {
      await message.delete();
      message.channel.send(`🚫 ${message.author}, that word is not allowed here.`);
      const embed = new EmbedBuilder()
        .setTitle('🚫 Banned Word Detected')
        .setColor(0xff8800)
        .addFields(
          { name: 'User', value: `${message.author.tag}` },
          { name: 'Channel', value: `${message.channel.name}` }
        )
        .setTimestamp();
      await sendLog(message.guild, embed);
    } catch (e) { console.error('Delete failed:', e.message); }
    return;
  }

  // ── Anti-link (for non-admins) ─────────────────────────────────────────
  const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);
  const hasLink = /(https?:\/\/|discord\.gg\/)/i.test(message.content);
  if (hasLink && !isAdmin) {
    try {
      await message.delete();
      message.channel.send(`🔗 ${message.author}, links are not allowed here.`);
    } catch (e) { console.error('Link delete failed:', e.message); }
    return;
  }

  // ── Commands ───────────────────────────────────────────────────────────
  if (!message.content.startsWith('!')) return;
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const ismod = message.member.permissions.has(PermissionFlagsBits.KickMembers);

  if (command === 'kick' && ismod) {
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mention a user to kick.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.kick(reason);
    message.reply(`👢 Kicked **${target.user.tag}** | Reason: ${reason}`);
    const embed = new EmbedBuilder().setTitle('👢 Member Kicked').setColor(0xff6600)
      .addFields({ name: 'User', value: target.user.tag }, { name: 'Reason', value: reason })
      .setTimestamp();
    await sendLog(message.guild, embed);
  }

  if (command === 'ban' && ismod) {
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mention a user to ban.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.ban({ reason });
    message.reply(`🔨 Banned **${target.user.tag}** | Reason: ${reason}`);
    const embed = new EmbedBuilder().setTitle('🔨 Member Banned').setColor(0xff0000)
      .addFields({ name: 'User', value: target.user.tag }, { name: 'Reason', value: reason })
      .setTimestamp();
    await sendLog(message.guild, embed);
  }

  if (command === 'mute' && ismod) {
    const target = message.mentions.members.first();
    const minutes = parseInt(args[1]) || 10;
    if (!target) return message.reply('Mention a user to mute.');
    await target.timeout(minutes * 60 * 1000, 'Muted by moderator');
    message.reply(`🔇 Muted **${target.user.tag}** for ${minutes} minutes.`);
  }

  if (command === 'unmute' && ismod) {
    const target = message.mentions.members.first();
    if (!target) return message.reply('Mention a user to unmute.');
    await target.timeout(null);
    message.reply(`🔊 Unmuted **${target.user.tag}**.`);
  }

  if (command === 'warn' && ismod) {
    const target = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';
    if (!target) return message.reply('Mention a user to warn.');
    target.send(`⚠️ You have been warned in **Karan Server** for: ${reason}`).catch(() => {});
    message.reply(`⚠️ Warned **${target.user.tag}** | Reason: ${reason}`);
  }

  if (command === 'serverinfo') {
    const g = message.guild;
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${g.name} Server Info`)
      .setColor(0x5865f2)
      .setThumbnail(g.iconURL())
      .addFields(
        { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
        { name: 'Members', value: `${g.memberCount}`, inline: true },
        { name: 'Channels', value: `${g.channels.cache.size}`, inline: true },
        { name: 'Roles', value: `${g.roles.cache.size}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setTimestamp();
    message.reply({ embeds: [embed] });
  }

  if (command === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Karan Bot Commands')
      .setColor(0x00c896)
      .setDescription('Protection & moderation commands:')
      .addFields(
        { name: '!kick @user [reason]', value: 'Kick a member' },
        { name: '!ban @user [reason]', value: 'Ban a member' },
        { name: '!mute @user [minutes]', value: 'Mute a member' },
        { name: '!unmute @user', value: 'Unmute a member' },
        { name: '!warn @user [reason]', value: 'Warn a member' },
        { name: '!serverinfo', value: 'Show server details' },
        { name: 'Auto-Protection', value: '✅ Anti-spam\n✅ Anti-link\n✅ Banned word filter\n✅ Join logging' }
      )
      .setFooter({ text: 'Karan Server Protection Bot 🛡️' });
    message.reply({ embeds: [embed] });
  }
});

// ══════════════════════════════════════════════════════════════════════════
//  NEW MEMBER JOIN LOG
// ══════════════════════════════════════════════════════════════════════════
client.on('guildMemberAdd', async (member) => {
  const embed = new EmbedBuilder()
    .setTitle('✅ New Member Joined')
    .setColor(0x00cc66)
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'User', value: `${member.user.tag} (${member.id})` },
      { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` },
      { name: 'Total Members', value: `${member.guild.memberCount}` }
    )
    .setTimestamp();
  await sendLog(member.guild, embed);

  // Warn about new (potentially fake) accounts
  const ageMs = Date.now() - member.user.createdTimestamp;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 7) {
    const warnEmbed = new EmbedBuilder()
      .setTitle('⚠️ New Account Alert')
      .setColor(0xffcc00)
      .setDescription(`${member.user.tag} has an account less than 7 days old. Monitor carefully.`)
      .setTimestamp();
    await sendLog(member.guild, warnEmbed);
  }
});

// ══════════════════════════════════════════════════════════════════════════
//  MEMBER LEAVE LOG
// ══════════════════════════════════════════════════════════════════════════
client.on('guildMemberRemove', async (member) => {
  const embed = new EmbedBuilder()
    .setTitle('👋 Member Left')
    .setColor(0x888888)
    .addFields({ name: 'User', value: `${member.user.tag} (${member.id})` })
    .setTimestamp();
  await sendLog(member.guild, embed);
});

client.login(TOKEN);
