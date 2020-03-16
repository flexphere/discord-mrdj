import Discord from 'discord.js';
import { Base } from './discordUtil/Base';
import { Bot, Command, Listen } from './discordUtil/Decorator';
import { Alphabet } from './Emoji';
import { Connection } from './DB';
const ytdl = require('ytdl-core');
const yts = require('yt-search');

interface YoutubeVideo {
    title: string;
    timestamp: string;
    url: string;
}

interface SearchResult {
    emoji: string;
    video: YoutubeVideo;
}

@Bot()
export class MrDJ extends Base {
    messageId: string = "";
    searchResults: SearchResult[] = [];
    playlist: SearchResult[] = [];
    playing: boolean = false;
    connection!: Discord.VoiceConnection;

    @Command('>mrdj skip')
    async requestSkip(message: Discord.Message, ...args: string[]) {
        if ( ! this.playlist.length) {
            return this.flashMessage(message.channel, "('A`)空っぽ ");
        }
        this.play();
    }

    @Command('>mrdj list')
    async requestPlaylist(message: Discord.Message, ...args: string[]) {
        if ( ! this.playlist.length) {
            return this.flashMessage(message.channel, "('A`)空っぽ ");
        }

        const embed = new Discord.MessageEmbed()
            .setTitle('予約一覧')
            .setColor(0xf8e71c)
            .setDescription(this.playlist.map(r => `${r.video.title}（${r.video.timestamp}）`).join("\n"));

        return this.flashMessage(message.channel, embed);
    }

    @Command('>mrdj play')
    async requestPlay(message: Discord.Message, ...args: string[]) {
        try {
            const searchKeyword = args.join(" ");
            
            const r = await yts(searchKeyword);
            if ( ! r?.videos) {
                return this.flashMessage(message.channel, '｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめん。動画みっかんなかった');
            }

            this.searchResults = r.videos.slice(0, 5).map((v:YoutubeVideo, i:number) => {
                return { emoji: Alphabet[i], video: v };
            });
    
            const embed = new Discord.MessageEmbed()
                .setTitle('検索結果一覧')
                .setColor(0xf8e71c)
                .setDescription(this.searchResults.map(r => `${r.emoji} ${r.video.title}（${r.video.timestamp}）`).join("\n"));
    
            const botMessage = await this.flashMessage(message.channel, embed, 10000);
            this.messageId = botMessage.id;
            this.searchResults.forEach(async(r) => {
                await botMessage.react(r.emoji);
            });
        } catch (e) {
            console.error(e);
            message.channel.send('｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめん。エラーだわ');
        }
    }

    @Listen('messageReactionAdd')
    async reaction(reaction: Discord.MessageReaction, user: Discord.User) {
        try {
            if (user.bot) {
                return;
            }

            if (reaction.message.id !== this.messageId) {
                return this.flashMessage(reaction.message.channel, `｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡もっかい検索してくれい`);
            }

            const member = reaction.message.guild?.member(user);
            if ( ! member) {
                return this.flashMessage(reaction.message.channel, `｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡あんた誰・・`);
            }

            if ( ! member.voice.channel) {
                return this.flashMessage(reaction.message.channel, `｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡音声チャンネルに入ってからやってくれい`);
            }
    
            const result = this.searchResults.find(r => r.emoji === reaction.emoji.name);
            if (result === undefined) {
                return this.flashMessage(reaction.message.channel, `｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめんうそ。そんな動画なかった`);
            }

            this.connection = await member.voice.channel?.join();
            if ( ! this.connection) {
                return;
            }

            this.playlist.push(result);

            const db = await Connection();
            await db.query('INSERT INTO history (url, title) values (?, ?)', [result.video.url, result.video.title]);

            if ( ! this.playing) {
                this.play();
            } else {
                return this.flashMessage(reaction.message.channel, `(*'ω')b+ 予約リストに入れたよ！`);
            }
        } catch (e) {
            console.error(e);
            reaction.message.channel.send('｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめん。エラーだわ');
        }
    }

    async play() {
        try {
            const queue =this.playlist.shift();
            if ( ! queue) {
                return;
            }

            this.client.user?.setActivity(`🎶 Now Playing... ${queue.video.title}\n${queue.video.url}`);
            this.playing = true;
            const stream = ytdl(queue.video.url, { filter: 'audioonly', highWaterMark: 1 << 25, });
            stream.on('end', () => {
                this.playing = false;
                this.play();
            });
            this.connection.play(stream);
        } catch (e) {
            console.log(e);
        }
    }

    async flashMessage(channel: Discord.TextChannel | Discord.DMChannel, context: string | Discord.MessageEmbed, duration: number = 5000) {
        const message = await channel.send(context);
        message.delete({timeout: duration});
        return message;
    }
}