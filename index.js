const Discord = require('discord.js');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const client = new Discord.Client();
const token = process.env.DISCORD_TOKEN
const command = '!mrdj';
const alphabet = [
    "🇦",
    "🇧",
    "🇨",
    "🇩",
    "🇪",
    "🇫",
    "🇬",
    "🇭",
    "🇮",
    "🇯",
    "🇰",
    "🇱",
    "🇲",
    "🇳",
    "🇴",
    "🇵",
    "🇶",
    "🇷",
    "🇸",
    "🇹",
    "🇺",
    "🇻",
    "🇼",
    "🇽",
    "🇾",
    "🇿"
];
let messageId;
let searchResults;
let userID
client.once('ready', () => {
    console.log('Bot Ready!');
    userID = client.user.id;
    client.user.setActivity("Mr.DJ");
});

client.on('message', async(message) => {
    try {
        if (!message.content.startsWith(command) || message.author.bot) return;

        const searchKeyword = message.content.slice(command.length)
        const r = await yts(searchKeyword);
        searchResults = r.videos.slice(0, 5).map((v, i) => {
            return { emoji: alphabet[i], video: v };
        });

        const embed = {
            title: "検索結果一覧",
            color: 0xf8e71c,
            description: searchResults.map(r => {
                return `${r.emoji} ${r.video.title}（${r.video.timestamp}）`;
            }).join("\n")
        };

        const botMessage = await message.channel.send({ embed });
        messageId = botMessage.id;
        searchResults.forEach(async(r) => {
            await botMessage.react(r.emoji);
        });
    } catch (e) {
        console.error(e);
        message.reply('｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめん。エラーだわ');
    }
});

client.on("messageReactionAdd", async(messageReaction, user) => {
    try {
        if (messageReaction.message.id !== messageId) return;

        const member = messageReaction.message.guild.member(user);
        if (member.id === userID) return;

        if (!member.voice.channel) {
            messageReaction.message.channel.send(`｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡音声チャンネルに入ってからやってくれい`);
            return;
        }

        const result = searchResults.find(r => r.emoji === messageReaction.emoji.name);
        await messageReaction.message.channel.send(`🎶 Now Playing... ${result.video.title}\n${result.video.url}`);
        client.user.setActivity(result.video.title);
        await messageReaction.message.delete();

        const connection = await member.voice.channel.join();
        const dispatcher = connection.play(ytdl(result.video.url, { filter: 'audioonly', highWaterMark: 1 << 25, }));
        dispatcher.on('end', reason => {
            connection.disconnect();
        });
    } catch (e) {
        console.error(e);
        message.reply('｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめん。エラーだわ');
    }
});

client.login(token);